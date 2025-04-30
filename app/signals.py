from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import Q
from .models import ItemAlibaba, PriceHistory, PriceRange, ItemAmazon, ProductAttribute
from datetime import date, timedelta
import random
from decimal import Decimal
from app.scrappers.scrape_alibaba import scrape_alibaba_attributes
from app.scrappers.scrape_amazon import scrape_amazon_attributes
from app.utils import clean_text


@receiver(post_save, sender=ItemAmazon)
def create_item_amazon(sender, instance, created, **kwargs):
    if created:
        try:
            atributos = scrape_amazon_attributes(instance.url)

            for key, value in atributos: 
                ProductAttribute.objects.create(
                item_amazon=instance,
                name=clean_text(key),
                value=clean_text(value) 
            )
        except Exception as e:
            print(f"Error scraping  atributos de Amazon: {e}")

        # Crear el historial de precios
        start_date = date.today() - timedelta(days=500) 
        for _ in range(10):
         price_date = start_date + timedelta(days=random.randint(1,360))
          
        # Crear el historial de precios
         if not PriceHistory.objects.filter(item_amazon=instance, date=price_date).exists():
            PriceHistory.objects.create(
                item_amazon=instance,
                current_price = instance.price + Decimal(str(random.uniform(-10, 10))),
                date = start_date + timedelta(days=random.randint(1, 30))
         )



@receiver(post_save, sender=ItemAlibaba)
def create_item_alibaba(sender, instance, created, **kwargs):
    if created:
        try:
            result = scrape_alibaba_attributes(instance.url)
            print("Scraping Alibaba result:", result)
            atributos = result.get("attributes", [])
            rangos = result.get("ranges", [])
            print("Atributos:", atributos)
            print("Rangos:", rangos)
            for key, value in atributos: 
                ProductAttribute.objects.create(
                item_alibaba=instance,
                name=clean_text(key),
                value=clean_text(value)
            )
                
            for rango in rangos:
                #separa el rango de precio en dos partes
                rango_unidades = rango["rango_unidades"].split("-")
                precio = float(rango["rango_precio"])
                instance_rango = None

                if len(rango_unidades) == 2:
                    instance_rango = PriceRange.objects.create(
                        item=instance,
                        minimo_range=rango_unidades[0],
                        maximo_range=rango_unidades[1],
                    )
                else:
                    instance_rango = PriceRange.objects.create(
                        item=instance,
                        minimo_range=rango["rango_unidades"],
                    )

                # Guardar precio en historialPrecios
                PriceHistory.objects.create(
                    item_alibaba=instance,
                    rango= instance_rango,
                    current_price=precio,
                    date=date.today(),
                )

                # Generar historial de precios dentro del rango creado
                base_price = precio
                start_date = date.today() - timedelta(days=500)

                for _ in range(10):  # Se crean 5 registros de historial
                    price_date = start_date + timedelta(days=random.randint(1, 360))
                    current_price = base_price + random.uniform(1, 10)

                    # Solo creamos el registro si no existe otro con esa fecha
                    if not PriceHistory.objects.filter(item_alibaba=instance, date=price_date).exists():
                        PriceHistory.objects.create(
                            item_alibaba=instance,
                            rango=instance_rango,
                            current_price=current_price,
                            date=price_date,
                        )
        except Exception as e:
            print(f"Error al guardar atributos de Alibaba: {e}")