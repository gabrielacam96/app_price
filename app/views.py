from django.shortcuts import render  # Usado en la vista 'home'
from django.http import HttpResponse, JsonResponse  # Usado para retornar respuestas HTTP y JSON
import requests  # Usado para hacer solicitudes HTTP
import time, random  # Usado para pausas y generar números aleatorios
from bs4 import BeautifulSoup  # Usado para analizar HTML en 'AmazonScrapeView'
from django.views import View  # Usado para vistas basadas en clases
from selenium import webdriver  # Usado para automatizar el navegador en 'AlibabaScrapeView'
from selenium.webdriver.chrome.service import Service  # Usado para configurar el servicio de ChromeDriver
from selenium.webdriver.chrome.options import Options  # Usado para configurar opciones de Chrome
from webdriver_manager.chrome import ChromeDriverManager  # Usado para gestionar la versión de ChromeDriver
from selenium.webdriver.common.keys import Keys  # Usado para enviar teclas al navegador
from fake_useragent import UserAgent  # Usado para generar User-Agent aleatorios
import undetected_chromedriver as uc  # Usado para evitar la detección de Selenium
from urllib.parse import urlparse  # Usado para analizar URLs
from selenium.webdriver.common.by import By  # Usado para seleccionar elementos en el DOM
from selenium.webdriver.support.ui import WebDriverWait  # Usado para esperar a que los elementos aparezcan
from selenium.webdriver.support import expected_conditions as EC  # Usado para condiciones esperadas


# Create your views here.

def home(request):
    return render(request, "home.html")


class AmazonScrapeView(View):
    def get(self, request, consulta):
        url = f"https://www.amazon.es/s?k={consulta}"
        headers = {
            "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                           "AppleWebKit/537.36 (KHTML, like Gecko) "
                           "Chrome/90.0.4430.93 Safari/537.36")
        }
        
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return JsonResponse({"error": "Error al obtener la página de Amazon"}, status=400)
        
        soup = BeautifulSoup(response.text, "html.parser")

        # Esperar un poco para que la página cargue
        time.sleep(random.uniform(5, 8))

        productos = []

        for producto in soup.find_all("div", {"data-component-type": "s-search-result"}):
            titulo = None
            h2 = producto.find("h2", class_="a-size-base-plus")
            if h2:
                span = h2.find("span")
                if span:
                    titulo = span.get_text().strip()
            
            imagen = None
            img_tag = producto.find("img", class_="s-image")
            if img_tag and "src" in img_tag.attrs:
                imagen = img_tag["src"]

            url =  None
            url_tag = producto.find("a", class_="a-link-normal")
            if url_tag:
                url = "https://www.amazon.es" + url_tag['href']
            
            precio = None
            precio_entero = producto.find("span", class_="a-price-whole")
            precio_decimal = producto.find("span", class_="a-price-fraction")
            if precio_entero:
                if precio_decimal:
                    precio = f"{precio_entero.get_text().strip()}.{precio_decimal.get_text().strip()}"
                else:
                    precio = precio_entero.get_text().strip()
            
            reviews = None
            review_span = producto.find("span", class_="a-size-base")
            if review_span:
                reviews = review_span.get_text().strip()
            
            rating = None
            rating_span = producto.find("span", class_="a-icon-alt")
            if rating_span:
                rating = rating_span.get_text().strip()

            productos.append({
                "titulo": titulo,
                "imagen": imagen,
                "url": url,
                "precio": precio,
                "reviews": reviews,
                "rating": rating,
            })
            
        return JsonResponse({"resultados": productos})

# Función para obtener la tasa de cambio USD → EUR
def obtener_tasa_cambio():
    url = "https://api.exchangerate.host/latest?base=USD&symbols=EUR"
    response = requests.get(url)
    data = response.json()

    print("🔍 Respuesta de la API:", data)  # Verifica si "rates" está presente

    if "rates" in data and "EUR" in data["rates"]:
        return data["rates"]["EUR"]
    else:
        print("⚠️ Error: No se pudo obtener la tasa de cambio. Usando valor por defecto.")
        return 0.92  # Tasa de cambio estimada como respaldo

class AlibabaScrapeView(View):
    def get(self, request, consulta):
        url = f"https://www.alibaba.com/trade/search?SearchText={consulta}"

        options = uc.ChromeOptions()
        options.add_argument("--headless")
        options.add_argument("--disable-blink-features=AutomationControlled")

        driver = uc.Chrome(options=options)
        driver.get(url)

        # Esperar a que los productos aparezcan antes de extraer datos
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CLASS_NAME, "fy23-search-card"))
            )
        except Exception as e:
            print("⚠️ No se encontraron productos.")
            return JsonResponse({"error": "No se encontraron productos."}, status=400)

        # Hacer scroll varias veces para cargar más productos
        for _ in range(5):
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(random.uniform(3, 6))  # Pausa aleatoria para evitar detección

        # Extraer HTML después del scroll
        soup = BeautifulSoup(driver.page_source, "html.parser")

        productos = extract_product_info(soup)

        driver.quit()

        return JsonResponse({"resultados": productos})

def scrape_product(url):
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/90.0.4430.93 Safari/537.36"
        )
    }
    
    parsed_url = urlparse(url)
    if "amazon" in parsed_url.netloc:
        return scrape_amazon(url, headers)
    elif "alibaba" in parsed_url.netloc:
        return scrape_alibaba(url)
    else:
        return {"error": "URL no compatible"}
    
def scrape_amazon(url, headers):
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        return {"error": "No se pudo acceder a la página"}
    
    soup = BeautifulSoup(response.text, "html.parser")
    
    producto = {}
    
    titulo_tag = soup.find("span", id="productTitle")
    producto["titulo"] = titulo_tag.get_text().strip() if titulo_tag else "No disponible"
    
    precio_tag = soup.find("span", class_="a-price-whole")
    producto["precio"] = precio_tag.get_text().strip() if precio_tag else "No disponible"
    
    img_tag = soup.find("img", id="landingImage")
    producto["imagen"] = img_tag["src"] if img_tag else "No disponible"
    
    return producto
    
def scrape_alibaba(url):

    options = uc.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-blink-features=AutomationControlled")

    driver = uc.Chrome(options=options)
    driver.get(url)

    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    time.sleep(random.uniform(3, 6))  # Pausa aleatoria para evitar detección

    # Extraer HTML después del scroll
    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    producto = {}
    
    # Extraer el título del producto
    titulo_tag = soup.find("h1")
    producto["titulo"] = titulo_tag.get_text().strip() if titulo_tag else "No disponible"
    
    # Extraer rangos de precios y unidades
    rangos = []
    for index, rango in enumerate(soup.find_all("div", class_="price-item"), start=1):
        rango_unidades = rango.find("div", class_="quality")
        rango_precio = rango.find("div", class_="price")
        
        if rango_unidades and rango_precio:
            rangos.append({
                f"rango_unidades_{index}": rango_unidades.get_text(strip=True),
                f"rango_precio_{index}": rango_precio.get_text(strip=True)
            })
    
    producto["rangos"] = rangos
    
    
    return producto


def scrape_alibaba_by_image(image_path):

    options = uc.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-blink-features=AutomationControlled")

    driver = uc.Chrome(options=options)
    
    
    try:
        driver.get("https://www.alibaba.com/")
        wait = WebDriverWait(driver, 10)

        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(random.uniform(3, 6))  # Pausa aleatoria para evitar detección

        # Encontrar el botón de búsqueda por imagen
        click_camera_button(wait)
        
        # Subir la imagen 
        upload_image(wait, image_path)
        
        # Esperar a que los resultados se carguen
        time.sleep(5)
        
        soup = BeautifulSoup(driver.page_source, "html.parser")
        productos = extract_product_info(soup)

        return JsonResponse({"resultados": productos})
        
    finally:
        driver.quit()

def click_camera_button(wait):
    camera_button = wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button.searchbar-button-icon.searchbar-button-icon-camera"))
    )
    camera_button.click()

def upload_image(wait, image_path):
    file_input = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']"))
    )
    file_input.send_keys(image_path)

def extract_product_info(soup):
    productos = []
    for producto in soup.find_all("div", class_="fy23-search-card"):
        titulo = extract_title(producto)
        url_producto = extract_url(producto)
        precio = extract_price(producto)
        imagen = extract_image(producto)
        empresa = extract_company(producto)
        valoracion = extract_rating(producto)

        productos.append({
            "titulo": titulo,
            "url": url_producto,
            "precio": precio,
            "imagen": imagen,
            "empresa": empresa,
            "valoracion": valoracion
        })
    return productos

def extract_title(producto):
    titulo = producto.find("h2", class_="search-card-e-title")
    return titulo.get_text(strip=True) if titulo else "Sin título"

def extract_url(producto):
    link_tag = producto.find("a", href=True)
    if link_tag:
        return "https:" + link_tag["href"] if link_tag["href"].startswith("//") else link_tag["href"]
    return None

def extract_price(producto):
    tasa_cambio = obtener_tasa_cambio()  # Obtener tasa USD → EUR
    precio = producto.find("div", class_="search-card-e-price-main")
    if precio:
        precio_texto = precio.get_text(strip=True).replace("$", "").strip()
        precios_usd = precio_texto.split("-")  # Dividir si hay un rango de precios
        try:
            if len(precios_usd) == 2:  # Si hay un rango (ej: "$2.50 - $3.20")
                min_usd = float(precios_usd[0].strip())
                max_usd = float(precios_usd[1].strip())
                min_eur = round(min_usd * tasa_cambio, 2)
                max_eur = round(max_usd * tasa_cambio, 2)
                return f"€{min_eur} - €{max_eur}"
            else:  # Si solo hay un precio (ej: "$5.00")
                precio_unico = float(precios_usd[0].strip())
                return f"€{round(precio_unico * tasa_cambio, 2)}"
        except ValueError:
            return "No disponible"
    return "No disponible"

def extract_image(producto):
    imagen = producto.find("img")
    return imagen["src"] if imagen else "Sin imagen"

def extract_company(producto):
    empresa = producto.find("div", class_="search-card-e-company margin-bottom-8")
    return empresa.get_text(strip=True) if empresa else "Sin empresa"

def extract_rating(producto):
    valoracion = producto.find("span", class_="search-card-e-review")
    return valoracion.get_text(strip=True) if valoracion else "Sin valoración"

