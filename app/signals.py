from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import (
    ItemAmazon, ItemAlibaba, ProductAttribute, PriceRange, PriceHistory,
    Budget, ListBudget, Inventario, ItemInventario
)
from datetime import date
from decimal import Decimal
import random
import calendar
from dateutil.relativedelta import relativedelta
from app.scrappers.scrape_amazon import scrape_amazon_attributes
from app.scrappers.scrape_alibaba import scrape_alibaba_attributes
from app.utils import clean_text

VARIACION_PORC = 0.05  # ±5%

def generar_historial_mensual(instance, meses=12, fechas_por_mes=5, base_price=None, alibaba=False, rango=None):
    """
    Crea `fechas_por_mes` registros de PriceHistory para cada uno de los
    `meses` meses anteriores.
    - instance: ItemAmazon o ItemAlibaba
    - base_price: Decimal o float, precio de referencia
    - alibaba: si True, asigna rango; si False, crea sin rango
    """
    hoy = date.today()
    for m in range(1, meses+1):
        mes_activo = hoy - relativedelta(months=m)
        year, month = mes_activo.year, mes_activo.month
        dias_mes = calendar.monthrange(year, month)[1]
        # tomamos `fechas_por_mes` días aleatorios únicos
        dias_aleatorios = random.sample(range(1, dias_mes+1), fechas_por_mes)
        for d in dias_aleatorios:
            registro_fecha = date(year, month, d)
            # variación realista ±5%
            variacion = random.uniform(-VARIACION_PORC, VARIACION_PORC)
            precio = float(base_price) * (1 + variacion)
            precio = round(precio, 2)
            # Evitar duplicados
            filt = {
                'date': registro_fecha,
                'current_price': precio
            }
            if alibaba:
                filt.update({'item_alibaba': instance, 'rango': rango})
            else:
                filt.update({'item_amazon': instance})
            # Crear si no existe
            if not PriceHistory.objects.filter(**{k: v for k, v in filt.items() if k in ['item_amazon','item_alibaba','date']}).exists():
                PriceHistory.objects.create(**filt)

@receiver(post_save, sender=ItemAmazon)
def create_item_amazon(sender, instance, created, **kwargs):
    if not created:
        return

    # 1) Scraping atributos
    try:
        atributos = scrape_amazon_attributes(instance.url)
        for key, value in atributos:
            ProductAttribute.objects.create(
                item_amazon=instance,
                name=clean_text(key),
                value=clean_text(value)
            )
    except Exception as e:
        print(f"[Amazon Scrape] Error: {e}")

    # 2) Generar historial mensual (12 meses x 5 fechas)
    base_price = instance.price
    generar_historial_mensual(
        instance,
        meses=12,
        fechas_por_mes=5,
        base_price=base_price,
        alibaba=False
    )

@receiver(post_save, sender=ItemAlibaba)
def create_item_alibaba(sender, instance, created, **kwargs):
    if not created:
        return

    # 1) Scraping atributos y rangos
    try:
        result = scrape_alibaba_attributes(instance.url)
        atributos = result.get("attributes", [])
        rangos = result.get("ranges", [])
        for key, value in atributos:
            ProductAttribute.objects.create(
                item_alibaba=instance,
                name=clean_text(key),
                value=clean_text(value)
            )
        # creamos rangos
        price_ranges = []
        for r in rangos:
            unidades = r["rango_unidades"].split("-")
            pr = float(r["rango_precio"])
            if len(unidades) == 2:
                pr_obj = PriceRange.objects.create(
                    item=instance,
                    minimo_range=int(unidades[0]),
                    maximo_range=int(unidades[1])
                )
            else:
                pr_obj = PriceRange.objects.create(
                    item=instance,
                    minimo_range=int(unidades[0])
                )
            price_ranges.append((pr_obj, pr))
            # registro inicial hoy
            PriceHistory.objects.create(
                item_alibaba=instance,
                rango=pr_obj,
                current_price=pr,
                date=date.today()
            )
    except Exception as e:
        print(f"[Alibaba Scrape] Error: {e}")

    # 2) Generar historial mensual para cada rango
    # Si no hay rangos, usamos el último precio scraped
    if price_ranges:
        for pr_obj, pr_val in price_ranges:
            generar_historial_mensual(
                instance,
                meses=12,
                fechas_por_mes=5,
                base_price=pr_val,
                alibaba=True,
                rango=pr_obj
            )
    else:
        # fallback: tomar último PriceHistory
        last = PriceHistory.objects.filter(item_alibaba=instance).order_by('-date').first()
        if last:
            generar_historial_mensual(
                instance,
                meses=12,
                fechas_por_mes=5,
                base_price=last.current_price,
                alibaba=True,
                rango=None
            )
@receiver(pre_save, sender=Budget)
def crear_inventario_si_recibido(sender, instance, **kwargs):
    if not instance.pk:
        return  # si es nuevo, no hay cambio de estado

    estado_anterior = Budget.objects.get(pk=instance.pk).estado
    if estado_anterior != 'recibido' and instance.estado == 'recibido':
        #hay inventario 
        inventario, created = Inventario.objects.get_or_create(
            name="Mi inventario",
            defaults={
            "user": instance.user  # Asegúrate que Budget tiene `user`
            }
        )

        # Suponemos que tienes un related_name='items' en Budget → ItemAlibaba o ItemBudget
        for item in instance.items.all():
            list_budget = ListBudget.objects.get(item=item.pk)
            ItemInventario.objects.create(
            item=item,
            unidades=list_budget.units,
            precio_venta=list_budget.price_calculated,
            precio_compra=list_budget.price_calculated,
            budget=instance,
            inventario=inventario
            )
