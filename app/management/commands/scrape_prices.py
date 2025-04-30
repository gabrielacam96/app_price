from django.core.management.base import BaseCommand
from app.models import ItemAlibaba, RangePrice, HistorialPrecio
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import re

class Command(BaseCommand):
    help = 'Scrapea los precios por rango y guarda en el historial'

    def handle(self, *args, **kwargs):
        productos = ItemAlibaba.objects.all()

        for producto in productos:
            url = producto.url
        
            print(f"Scrapeando: {producto.title}")

            try:
                headers = {
                    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                   "AppleWebKit/537.36 (KHTML, like Gecko) "
                                   "Chrome/90.0.4430.93 Safari/537.36")
                }
                response = requests.get(url, headers=headers)
                soup = BeautifulSoup(response.content, "html.parser")

                # Buscar todos los bloques de rango de precio
                bloques = soup.select('div[role="group"]')

                for bloque in bloques:
                    partes = bloque.find_all("div")
                    if len(partes) >= 2:
                        # Ej: "2 - 499 pares"
                        rango_texto = partes[0].get_text().strip()
                        precio_texto = partes[1].get_text().strip()

                        # Limpiar y extraer datos
                        rango_match = re.match(r"(\d+)\s*-\s*(\d+)", rango_texto)
                        if not rango_match:
                            continue  # Saltar si no matchea

                        rango_min = int(rango_match.group(1))
                        rango_max = int(rango_match.group(2))

                        precio_limpio = precio_texto.replace("€", "").replace(",", ".").strip()
                        try:
                            precio = float(precio_limpio)
                        except ValueError:
                            continue

                        # Buscar o crear el rango
                        rango_obj, created = RangePrice.objects.get_or_create(
                            item=producto,
                            rango_minimo=rango_min,
                            rango_maximo=rango_max
                        )

                        # Registrar en historial
                        HistorialPrecio.objects.create(
                            item=producto,
                            rango=rango_obj,
                            precio=precio,
                            fecha=datetime.now()
                        )
                        print(f"✓ Rango {rango_min}-{rango_max}: {precio}€")

            except Exception as e:
                print(f"❌ Error con {producto.title}: {e}")
