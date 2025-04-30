import textwrap
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.views import View
from django.middleware.csrf import get_token
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User, Group
from django.db.models import Q
from django.utils import timezone
from django.core.exceptions import PermissionDenied
from app.utils import clean_text
from django.db.models import OuterRef, Subquery, Max
from urllib.parse import quote_plus
from django.contrib.auth import get_user_model


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAdminUser


from urllib.parse import urlparse, unquote, urlencode
import requests
import time
import random
import re
from bs4 import BeautifulSoup
from app.ml.feature_extraction import extract_features
from app.scrappers import scrape_alibaba, scrape_amazon

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import undetected_chromedriver as uc

from fake_useragent import UserAgent


import requests, re
from urllib.parse import urlencode
from rest_framework.permissions import IsAuthenticated
from io import BytesIO
from reportlab.pdfgen import canvas
from rest_framework.decorators import action
import logging

logger = logging.getLogger(__name__)





from .serializers import (
    LoginSerializer, RegisterSerializer, SupplierSerializer, ItemAlibabaSerializer,
    ItemAmazonSerializer, ProductAttributeSerializer, CoincidenceSerializer,
    PriceRangeSerializer, PriceHistorySerializer, ComparacionSerializer,
    AlertSerializer, BudgetSerializer, ListBudgetSerializer, FollowingSerializer,
    ListFollowingSerializer,UserSerializer, ChangeGroupSerializer
)
from .models import (
    Supplier, ItemAlibaba, ItemAmazon, ProductAttribute, Coincidence, PriceRange,
    PriceHistory, Comparacion, Alert, Budget, ListBudget, Following, ListFollowing, CategoryAmazon, CategoryAlibaba,ProductAttribute
)

def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})

@api_view(['POST'])
def refresh_view(request):
    # Leer refresh_token desde cookies
    refresh_token = request.COOKIES.get('refresh_token', None)
    if not refresh_token:
        return Response({"error": "No refresh token"}, status=400)

    try:
        refresh = RefreshToken(refresh_token)
        new_access = refresh.access_token
    except Exception as e:
        return Response({"error": str(e)}, status=400)

    response = Response({"detail": "token refreshed"}, status=200)
    response.set_cookie(
        'access_token',
        str(new_access),
        httponly=True,
        secure=False,
        samesite='None',
        max_age=3600  # coincide con tu access token lifetime
    )
    return response

User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    """
    /users/      (GET, POST)  
    /users/{pk}/ (GET, PATCH, DELETE)  
    /users/{pk}/cambiar-grupo/   (PATCH)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]          # sólo admin cambia los grupos

    @action(detail=True, methods=["patch"], url_path="cambiar-grupo")
    def cambiar_grupo(self, request, pk=None):
        """
        PATCH /users/{id}/cambiar-grupo/
        Body: {"group":"usuario_premium"}
        """
        ser = ChangeGroupSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        group_name = ser.validated_data["group"]

        usuario = self.get_object()

        # opcional: quita todos los grupos al que pertenece
        usuario.groups.clear()

        group = Group.objects.get(name=group_name)
        usuario.groups.add(group)
        
        return Response(
            {"status": "ok", "new_group": group_name},
            status=status.HTTP_200_OK,
        )

    def update(self, request, *args, **kwargs):
        """
        PATCH /users/{id}/
        Actualiza los datos del usuario.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not user.check_password(old_password):
        return Response({'error': 'La contraseña actual es incorrecta'}, status=400)

    if len(new_password) < 8:
        return Response({'error': 'La nueva contraseña debe tener al menos 8 caracteres'}, status=400)

    user.set_password(new_password)
    user.save()

    return Response({'message': 'Contraseña actualizada con éxito'})

def extract_amazon_products(soup, max_items=20):
    resultados = []
    cards = soup.select('div[data-component-type="s-search-result"]')[:max_items]
    for card in cards:
        # — 1) TÍTULO — 
        # Intento selector span dentro de h2 > a
        h2 = card.select_one('h2.a-size-base-plus')
        titulo = None
        if h2:
            # intento span normal
            span = h2.select_one('span')
            if span and span.get_text(strip=True):
                titulo = span.get_text(strip=True)

        # — 2) URL —  
        url = None
        a2 = card.select_one('a.a-link-normal.s-link-style')
        if a2 and a2.get('href'):
            url = 'https://www.amazon.es' + a2['href']

        # — 3) IMAGEN, PRECIO, RATING, REVIEWS (igual que antes) —
        imagen = None
        img = card.select_one('img.s-image')
        if img and img.get('src'):
            imagen = img['src']

        precio = None
        whole = card.select_one('span.a-price-whole')
        frac  = card.select_one('span.a-price-fraction')
        if whole:
            w = whole.get_text(strip=True).replace('.', '').replace(',', '')
            precio = f"{w}.{frac.get_text(strip=True)}" if frac else w

        rating = None
        rspan = card.select_one('span.a-icon-alt')
        if rspan:
            m = re.search(r'([\d,]+)', rspan.get_text())
            if m:
                rating = float(m.group(1).replace(',', '.'))

        reviews = None
        rsp = card.select_one('span.a-size-base.s-underline-text')
        if rsp:
            reviews = rsp.get_text(strip=True)

        resultados.append({
            'titulo': titulo,
            'url':     url,
            'imagen':  imagen,
            'precio':  precio,
            'rating':  rating,
            'reviews': reviews,
        })
    return resultados

def extract_amazon_products_filtro(soup, max_items=20):
    """
    Extrae de la sección "Los más vendidos" de Amazon:
      - title: nombre del producto
      - rating: puntuación media (float)
      - stars: número de estrellas (float)
      - reviews: número de reseñas (int)
      - url: enlace al detalle del producto (completo)
      - image: URL de la imagen principal
      - price: precio como string (p.ej. "18,99 €")
    """
    items = []
    # Cada producto viene dentro de div.p13n-sc-uncoverable-faceout
    cards = soup.select("div.p13n-sc-uncoverable-faceout")[:max_items]
    print(f"Encontrados {len(cards)} productos en la sección de tendencia")

    for card in cards:
        # 1) URL y título
        link_a = card.select_one("a.a-link-normal.aok-block")
        relative_url = link_a["href"] if link_a and link_a.get("href") else ""
        url = f"https://www.amazon.es{relative_url}"
        print(f"URL: {url}")

        title_span = card.select_one("div._cDEzb_p13n-sc-css-line-clamp-3_g3dy1")
        
        if title_span == None:
            #cuando la categoria es all cambia el selector
           # Basta con pescarlos por la clase "p13n-sc-truncate-fallback":
            title_span = (
            card.select_one('div[data-rows="1"]')
            or card.select_one("div.p13n-sc-truncate-fallback")
        )


        title = title_span.get_text(strip=True) if title_span else None
        print(f"Título: {title}")
        # 2) Imagen
        img = card.select_one("div.a-section.a-spacing-mini._cDEzb_noop_3Xbw5 img")
        image = img["src"] if img and img.get("src") else None
        print(f"Imagen: {image}")
        # 3) Rating y reviews
        rating_anchor = card.select_one("div.a-icon-row a")
        rating = None
        reviews = None
        stars = None
        if rating_anchor:
            title_attr = rating_anchor.get("title", "")
            # Ej: "4,3 de 5 estrellas, 13.348 calificaciones"
            import re
            m = re.search(r"([\d,]+)\s+de\s+5\s+estrellas", title_attr)
            if m:
                stars = float(m.group(1).replace(",", "."))
            m2 = re.search(r"([\d\.]+)\s+calificaciones", title_attr)
            if m2:
                reviews = int(m2.group(1).replace(".", ""))
            # A veces rating_media == stars
            rating = stars

        # 4) Precio
        price_span = card.select_one("span.a-size-base.a-color-price")
        if price_span:
            price_text = price_span.get_text(strip=True).replace("€", "").replace(",", ".")
            try:
             price = float(price_text)
            except ValueError:
             price = None
        else:
            price = None

        items.append({
            "titulo":     title,
            "rating":    rating,
            "reviews":   reviews,
            "url":       url,
            "imagen":     image,
            "precio":     price,
        })

    return items

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scrape_amazon_products(request):
    query     = request.query_params.get('query')
    category  = request.query_params.get('category')
    tendencia = request.query_params.get('filtro')

    # Validación de parámetros
    if not category or not (query or tendencia):
        return Response({'error': 'Faltan parámetros query o category'}, status=400)

    # Construcción de la URL
    if tendencia:
        if category == 'all':
            url = f"https://www.amazon.es/gp/{tendencia}"
        else:
            url = f"https://www.amazon.es/gp/{tendencia}/{category}"
    else:
        params = {'k': query, 'i': category}
        url    = f"https://www.amazon.es/s?{urlencode(params)}"
    print("la urles",url)
    headers = {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Accept':          'text/html,application/xhtml+xml'
    }

    # 1) Intento rápido con requests + BeautifulSoup
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        productos = (extract_amazon_products_filtro(soup)
                     if tendencia else
                     extract_amazon_products(soup))
        completos = [p for p in productos if p.get('titulo') and p.get('url')]
        if completos:
            return Response({'resultados': completos})
    except Exception:
        # ignora y pasa al fallback
        pass

    # 2) Fallback con Selenium (con context‐manager)
    chrome_opts = Options()
    chrome_opts.add_argument('--headless')
    chrome_opts.add_argument('--disable-gpu')
    chrome_opts.add_argument('--no-sandbox')
    chrome_opts.add_argument('--disable-dev-shm-usage')
    # Desactivar recursos para mayor velocidad
    prefs = {
        "profile.managed_default_content_settings.images":       2,
        "profile.managed_default_content_settings.stylesheets":  2,
        "profile.managed_default_content_settings.fonts":        2,
    }
    chrome_opts.add_experimental_option('prefs', prefs)

    service = Service(ChromeDriverManager().install())

    try:
        with webdriver.Chrome(service=service, options=chrome_opts) as driver:
            driver.get(url)
            WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'div[data-component-type="s-search-result"]'))
            )
            soup = BeautifulSoup(driver.page_source, 'html.parser')
            productos = (extract_amazon_products_filtro(soup)
                         if tendencia else
                         extract_amazon_products(soup))
            completos = [p for p in productos if p.get('titulo') and p.get('url')]
            return Response({'resultados': completos})
    except Exception as e:
        # Log completo en servidor
        logger.exception("Selenium falló al cargar la página Amazon")
        # Enviar sólo la primera línea al cliente
        first_line = str(e).splitlines()[0]
        return Response({'error': f'Error en Selenium: {first_line}'}, status=500)




def _build_driver():
    opts = Options()
    opts.add_argument("--headless=new")          # headless moderno
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-webgl") 
    opts.add_argument("--disable-dev-shm-usage")
    opts.page_load_strategy = "eager"            # no espera imgs/css

    # bloquea imgs, css, fuentes via CDP
    blocked = ["*.png", "*.jpg", "*.jpeg", "*.gif", "*.svg",
               "*.webp", "*.css", "*.woff", "*.woff2", "*.ttf"]
    drv = webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=opts
    )
    drv.execute_cdp_cmd("Network.enable", {})
    drv.execute_cdp_cmd("Network.setBlockedURLs", {"urls": blocked})
    return drv

_DRIVER = _build_driver()


# ─── helper ─────────────────────────────────────────────────────────────
def _scroll_until(driver, min_cards=20, max_scrolls=8):
    """
    Hace scroll hasta que aparezcan al menos `min_cards`
    o se agote `max_scrolls`.
    """
    sel = ".fy23-search-card, .fy24-search-card"
    last = 0
    for _ in range(max_scrolls):
        cur = len(driver.find_elements(By.CSS_SELECTOR, sel))
        if cur >= min_cards or cur == last:
            break
        last = cur
        driver.execute_script("window.scrollBy(0, window.innerHeight*0.9)")
        WebDriverWait(driver, 2).until(
            lambda d: len(d.find_elements(By.CSS_SELECTOR, sel)) > cur
        )

# ─── vista ──────────────────────────────────────────────────────────────
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def scrape_alibaba_products(request):
    consulta  = request.query_params.get("consulta")
    categoria = request.query_params.get("categoria")

    if not consulta:
        return JsonResponse({"error": "Falta parámetro consulta"}, status=400)

    url  = "https://spanish.alibaba.com/trade/search?SearchText=" + quote_plus(consulta)
    if categoria:
        url += f"&categoryId={categoria}"

    driver = _DRIVER
    try:
        driver.get(url)
        WebDriverWait(driver, 6).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, ".fy23-search-card, .fy24-search-card")
            )
        )
        _scroll_until(driver, min_cards=20)           # ⬅️  solo hasta 20
        soup = BeautifulSoup(driver.page_source, "lxml")
        productos = extract_product_info(soup, max_items=20)  # ⬅️  corta a 20
        return JsonResponse({"resultados": productos})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def scrape_alibaba_by_image(request):
    image = request.query_params.get("image")
    image_url = unquote(image)
    options = uc.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-blink-features=AutomationControlled")

    driver = uc.Chrome(options=options)
    
    try:
        driver.get("https://spanish.alibaba.com/")
        wait = WebDriverWait(driver, 5)  # Aumentar el tiempo de espera a 20 segundos
        
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(random.uniform(2, 5))  # Pausa aleatoria para evitar detección

        html = driver.page_source
        with open("alibaba_source.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Código fuente guardado en alibaba_source.html")

        close_gdpr_popup(driver,wait)
        # Encontrar el botón de búsqueda por imagen
        click_camera_button(driver, wait)
        
        # Subir la imagen 
        upload_image(wait, image_url)
        
        # Esperar a que los resultados se carguen
        time.sleep(5)
        
        soup = BeautifulSoup(driver.page_source, "html.parser")
        productos = extract_product_info(soup)
        

    except Exception as e:
        print("Error en el scraping:", e)

    finally:
        try:
            if driver.service.process and driver.service.process.poll() is None:
                driver.quit()
                print("Driver cerrado correctamente.")
            else:
                print("El driver ya estaba cerrado.")
        except Exception as e:
            print("Error al cerrar el driver:", e)
    
    return JsonResponse(productos, safe=False)

def close_gdpr_popup(driver, wait):
    try:
        # Esperar y hacer clic en el botón "Aceptar"
        gdpr_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'gdpr-btn gdpr-agree-btn')]"))
        )
        gdpr_button.click()
        print("Ventana de GDPR cerrada con éxito.")
        time.sleep(2)  # Esperar antes de continuar
    except Exception as e:
        print("No se encontró la ventana GDPR o ya estaba cerrada:", e)


def upload_image(wait, image_url):
    try:
        # Esperar a que aparezca el input donde se puede pegar la URL
        url_input = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input.image-upload-link-url"))
        )

        # Pegar la URL en el campo de entrada
        url_input.clear()
        url_input.send_keys(image_url)
        print("URL de la imagen pegada con éxito.")

        # Esperar a que el botón de búsqueda sea clickeable
        search_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "button.image-upload-link-search"))
        )

        # Hacer clic en el botón de búsqueda
        search_button.click()
        print("Búsqueda iniciada.")

        time.sleep(5)  # Esperar a que se carguen los resultados

    except Exception as e:
        print("Error al pegar la URL de la imagen y buscar:", e)
        raise


def click_camera_button(driver, wait):

    try:


        camera_button = wait.until(
            EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'search-bar-picture')]"))
        )

        print("Botón de la cámara encontrado.")
        
        driver.execute_script("arguments[0].scrollIntoView();", camera_button)  # Asegurar visibilidad
        time.sleep(2)  # Dar tiempo a la animación
        
        camera_button.click()
        print("Botón de la cámara clickeado con éxito.")
      
    except Exception as e:
        print("Error al encontrar el botón de la cámara:", e)
        driver.save_screenshot("error_screenshot.png")  # Guardar una captura de pantalla para depuración
        raise

def filtrar_rating(texto):
    # Busca el primer número decimal en el string
    match = re.search(r'\d+\.\d+', texto)
    if match:
        return float(match.group())
    return None

def extract_product_info(soup, max_items=20):
    productos = []
    listas = soup.find_all("div", class_="fy23-search-card")
    lista = listas[:max_items]
    print("Encontrados", len(lista), "productos similares")
    for producto in lista:
        titulo = extract_title(producto)
        url_producto = extract_url(producto)
        precio = extract_price(producto)
        orden_minima = extract_min_order(producto)
        imagen = extract_image(producto)
        empresa = extract_company(producto)
        valoracion = extract_rating(producto)

        productos.append({
            "titulo": titulo,
            "url": url_producto,
            "precio": precio,
            "orden_minima": orden_minima,
            "imagen": imagen,
            "empresa": empresa,
            "valoracion": filtrar_rating(valoracion)
        })
    return productos

def extract_min_order(producto):
    orden_minima = producto.find("div", class_="search-card-m-sale-features__item")
    if orden_minima:
        orden_minima_texto = orden_minima.get_text(strip=True)
        # Usar una expresión regular para extraer solo los dígitos
        match = re.search(r'\d+', orden_minima_texto)
        if match:
            return match.group()
    return "No disponible"

def extract_title(producto):
    titulo = producto.find("h2", class_="search-card-e-title")
    return titulo.get_text(strip=True) if titulo else "Sin título"

def extract_url(producto):
    link_tag = producto.find("a", href=True)
    if link_tag:
        url = "https:" + link_tag["href"] if link_tag["href"].startswith("//") else link_tag["href"]
        return url.replace(".com", ".es")
    return None

def extract_price(producto):
    precio = producto.find("div", class_="search-card-e-price-main")
    if precio:
        precio_texto = precio.get_text(strip=True)

        # Eliminar caracteres no numéricos excepto "." y ",", y quitar el símbolo de euro si está presente
        precio_texto = re.sub(r"[^\d,.-]", "", precio_texto)

        # Dividir si hay un rango de precios (ej: "164,77-408,51")
        precios_eur = precio_texto.split("-")  

        try:
            if len(precios_eur) == 2:  # Si hay un rango de precios
                min_eur = float(precios_eur[0].replace(",", ".").strip())  # Convertir , a .
                max_eur = float(precios_eur[1].replace(",", ".").strip())
                return f"€{min_eur} - €{max_eur}"
            else:  # Si solo hay un precio único
                precio_unico = float(precios_eur[0].replace(",", ".").strip())
                return f"€{precio_unico}"
        except ValueError:
            return "No disponible"

    return "No disponible"

def extract_image(producto):
    imagen = producto.find("img")
    return imagen["src"] if imagen else "Sin imagen"

def extract_company(producto):
    empresa = producto.find("a", class_="search-card-e-company margin-bottom-8")
    return empresa.get_text(strip=True) if empresa else "Sin empresa"

def extract_rating(producto):
    valoracion = producto.find("span", class_="search-card-e-review")
    return valoracion.get_text(strip=True) if valoracion else "Sin valoración"


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    user = request.user
    print("Current user:", user)
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name':user.first_name,
        'last_name':user.last_name,
        'groups': [group.name for group in user.groups.all()]
    })

class AuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data["username"]
            password = serializer.validated_data["password"]

            user = authenticate(request, username=username, password=password)
            if user is not None:
                # (Opcional) Django login si quieres usar también sesión local
                login(request, user)  

                # 1) Generar los tokens con SimpleJWT
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)

                # 2) Crear la respuesta con datos del usuario
                response = Response({
                    "username": user.username,
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name":user.last_name,
                    "groups": [group.name for group in user.groups.all()]
                }, status=status.HTTP_200_OK)

                # 3) Guardar tokens en cookies seguras y HttpOnly
                # Nota: secure=True solo si usas HTTPS en producción
                response.set_cookie(
                    key='access_token',
                    value=access_token,
                    httponly=True,
                    secure=True,
                    samesite='None',   # 'Lax' o 'None' si tu front y back están en distintos dominios
                    max_age=3600,       # 1 hora (igual a tu ACCESS_TOKEN_LIFETIME)
                    path='/',           # Ruta de la cookie
                )
                response.set_cookie(
                    key='refresh_token',
                    value=refresh_token,
                    httponly=True,
                    secure=True,
                    samesite='None',
                    max_age=86400,     # 24 horas (igual a tu REFRESH_TOKEN_LIFETIME)
                    path='/',
                )

                return response

            return Response({"error": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        # Cierra sesión de Django si la hay
        logout(request)

        response = Response({"message": "Logout exitoso"}, status=status.HTTP_200_OK)

        # Borra las cookies de token
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/')
        response.delete_cookie('sessionid', path='/')  # por si usas login(request, user)

        return response

class RegisterView(APIView):
    permission_classes = [AllowAny]  # Permitir registro sin autenticación

    def post(self, request):
        """
        Registrar un nuevo usuario.
        """
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "Usuario registrado correctamente", "user": user.username}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
# Metodo HTTP	URL	Acción	Método en la clase
# Get	/items_alibaba/	Listar	list(self, request)
# Post	/items_alibaba/	Crear	create(self, request)
# Get	/items_alibaba/<id>/	Obtener uno	retrieve(self, request)
# Put	/items_alibaba/<id>/	Actualizar	update(self, request)
# Delete	/items_alibaba/<id>/	Eliminar	destroy(self, request)
class ItemAlibabaViewSet(viewsets.ModelViewSet):
    queryset = ItemAlibaba.objects.all()
    serializer_class = ItemAlibabaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        title_param = self.request.query_params.get('title')

        # Filtrar por título, si se envía ?title=...
        if title_param:
            queryset = queryset.filter(
            Q(title__iexact=title_param) | Q(title__icontains=title_param[:50])
        )
            
        return queryset



# Método HTTP	URL	Acción	Método en la clase
# GET	/items_amazon/	Listar	list(self, request)
# POST	/items_amazon/	Crear	create(self, request)
# GET	/items_amazon/<id>/	Obtener uno	retrieve(self, request)
# PUT	/items_amazon/<id>/	Actualizar	update(self, request)
# DELETE	/items_amazon/<id>/	Eliminar	destroy(self, request)

class ItemAmazonViewSet(viewsets.ModelViewSet):
    queryset = ItemAmazon.objects.all()
    serializer_class = ItemAmazonSerializer
    permission_classes = [AllowAny]  # Permitir acceso sin autenticación
    
    # Mantenemos el 'lookup_field' por defecto (pk), para detalle con /itemamazon/<id>/
    # lookup_field = 'pk' (implícito, no necesitas especificarlo si no lo cambias a 'title')

    def get_queryset(self):
        queryset = super().get_queryset()
        title_param = self.request.query_params.get('title')
        id_param = self.request.query_params.get('id')

        # Filtrar por título, si se envía ?title=...
        if title_param:
            queryset = queryset.filter(
            Q(title__iexact=title_param) | Q(title__icontains=title_param[:50])
        )

        # Filtrar por ID, si se envía ?id=...
        if id_param:
            queryset = queryset.filter(pk=id_param)

        return queryset

        
    

class ProductAttributeViewSet(viewsets.ModelViewSet):
    queryset = ProductAttribute.objects.all()
    serializer_class = ProductAttributeSerializer

class CoincidenceViewSet(viewsets.ModelViewSet):
    queryset = Coincidence.objects.all()
    serializer_class = CoincidenceSerializer

#Metodo HTTP	URL	Acción	Método en la clase
# GET	/price_range/	Listar	list(self, request)
# POST	/price_range/	Crear	create(self, request)   
# GET	/price_range/<id>/	Obtener uno	retrieve(self, request)
# PUT	/price_range/<id>/	Actualizar	update(self, request)
# DELETE /price_range/<id>/	Eliminar	destroy(self, request)

class PriceRangeViewSet(viewsets.ModelViewSet):
    queryset = PriceRange.objects.all()
    serializer_class = PriceRangeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
           item_id = self.request.query_params.get("item")
           if(item_id):
               return self.queryset.filter(item = item_id)
           else:
               return self.get_queryset()


 #Metodo HTTP	URL	Acción	Método en la clase
# GET	/price_history/	Listar	list(self, request)
# POST	/price_history/	Crear	create(self, request)   
# GET	/price_history/<id>/	Obtener uno	retrieve(self, request)
# PUT	/price_history/<id>/	Actualizar	update(self, request)
# DELETE	/price_history/<id>/	Eliminar	destroy(self, request)
   

class PriceHistoryViewSet(viewsets.ModelViewSet):
    queryset = PriceHistory.objects.all()
    serializer_class = PriceHistorySerializer
    permission_classes = [IsAuthenticated]


    def get_queryset(self):
        qs = super().get_queryset()
        item_amazon_id  = self.request.query_params.get("item_amazon")
        item_alibaba_id = self.request.query_params.get("item_alibaba")
        date_param      = self.request.query_params.get("date")

        if item_amazon_id:
            return qs.filter(item_amazon_id=item_amazon_id)

        if item_alibaba_id and date_param:
            # ▼ último registro por rango para ese item_alibaba
            latest_per_rango = (
                qs.filter(item_alibaba_id=item_alibaba_id, rango=OuterRef("rango"))
                .order_by("-date")          # más reciente primero
                .values("id")[:1]           # nos quedamos con su PK
            )
            return (
                qs.filter(item_alibaba_id=item_alibaba_id)
                .exclude(rango=None)
                .filter(id__in=Subquery(latest_per_rango))
                .order_by("-date")          # opcional: ya son los más recientes
            )

        if item_alibaba_id:
            return qs.filter(item_alibaba_id=item_alibaba_id)

        return qs



# método HTTP	URL	Acción	Método en la clase
# GET	/comparaciones/	Listar	list(self, request)
# POST	/comparaciones/	Crear	create(self, request)
# GET	/comparaciones/<id>/	Obtener uno	retrieve(self, request)
# PUT	/comparaciones/<id>/	Actualizar	update(self, request)
# PATCH	/comparaciones/<id>/	Actualizar parcial	partial_update()
# DELETE	/comparaciones/<id>/	Eliminar	destroy(self, request)

class ComparacionViewSet(viewsets.ModelViewSet):
    queryset = Comparacion.objects.all()
    serializer_class = ComparacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Solo mostrar las comparaciones del usuario actual
        """
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        instance = self.get_object()
        serializer.save(user=instance.user)

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Solo mostrar las alertas del usuario actual
        """
        user = self.request.user
        usuario = self.request.query_params.get('usuario')

        if usuario and user.is_staff:
            return self.queryset.filter(user=usuario)
        else:
            if user.is_staff:
                return self.queryset.all()
            else:
                return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# Método HTTP	URL	Acción	Método en la clase
# GET	/budgets/	Listar	list(self, request)
# POST	/budgets/	Crear	create(self, request)
# GET	/budgets/<id>/	Obtener uno	retrieve(self, request)
# PUT	/budgets/<id>/	Actualizar	update(self, request)
# PATCH	/budgets/<id>/	Actualizar parcial	partial_update()
# DELETE	/budgets/<id>/	Eliminar	destroy(self, request)


class BudgetViewSet(viewsets.ModelViewSet):
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]  # Ensure permissions allow POST requests

    def get_queryset(self):
        """
        Solo mostrar los presupuestos del usuario actual
        """
        name = self.request.query_params.get('name')
        usuario = self.request.query_params.get('usuario')
        user = self.request.user
        if usuario and user.is_staff:
             return self.queryset.filter(user=usuario)  
        else:
            if (name):
                return self.queryset.filter(user=self.request.user, name__icontains=name)
            else: 
                if user.is_staff:
                    return self.queryset.all()
                else:
                    return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

   
    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        budget = self.get_object()
        lb_qs = ListBudget.objects.filter(lista=budget)

        # Preparamos buffer y canvas
        buffer = BytesIO()
        p = canvas.Canvas(buffer)
        
        # --- Encabezado fijo ---
        p.setFont("Helvetica-Bold", 18)
        p.drawString(50, 820, "COSTRACK")
        p.setFont("Helvetica", 12)
        p.drawString(50, 800, "Domicilio: Universidad de Alicante")

        # Título del presupuesto
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, 780, f"Presupuesto: {budget.name}")

        # Encabezados de tabla
        y = 760
        p.setFont("Helvetica-Bold", 12)
        headers = ["Producto", "Unidades", "Coste envío", "Precio unit.", "Total"]
        col_x = [50, 300, 380, 460, 540]
        for idx, header in enumerate(headers):
            p.drawString(col_x[idx], y, header)

        # Filas de items con wrap de título
        p.setFont("Helvetica", 10)
        y -= 20
        total_general = 0
        line_height = 12
        max_chars = 30

        for lb in lb_qs:
            # Calculamos total de este ítem
            unidades = lb.units or 0
            precio_u = float(lb.price_calculated or 0)
            envio    = float(lb.shipping_cost or 0)
            total    = unidades * precio_u + envio
            total_general += total

            # Preparamos el título con wrap
            title = lb.item.title or ""
            wrapped = textwrap.wrap(title, max_chars) or [""]

            # Dibujamos líneas de título
            for i, line in enumerate(wrapped):
                p.drawString(col_x[0], y - i * line_height, line)

            # Dibujamos las demás columnas en la primera línea
            p.drawString(col_x[1], y, str(unidades))
            p.drawString(col_x[2], y, f"{envio:.2f}")
            p.drawString(col_x[3], y, f"{precio_u:.2f}")
            p.drawString(col_x[4], y, f"{total:.2f}")

            # Bajamos el cursor en función de cuántas líneas ocupó el título
            y -= max(line_height * len(wrapped), line_height)

            # Nueva página si nos quedamos sin espacio
            if y < 100:
                p.showPage()
                # Dibujar de nuevo encabezado de tabla en la nueva página
                p.setFont("Helvetica-Bold", 12)
                y = 800
                for idx, header in enumerate(headers):
                    p.drawString(col_x[idx], y, header)
                p.setFont("Helvetica", 10)
                y -= 20

        # Pie de página con total general
        if y < 100:
            p.showPage()
            y = 800
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, y - 20, f"TOTAL PRESUPUESTO: {total_general:.2f} €")

        # Finalizar PDF
        p.showPage()
        p.save()
        buffer.seek(0)

        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="presupuesto_{budget.id}.pdf"'
        return response


# Método HTTP	URL	Acción	Método en la clase
# GET	/list_budget/	Listar	list(self, request)
# POST	/list_budget/	Crear	create(self, request)
# GET	/list_budget/<id>/	Obtener uno	retrieve(self, request)
# PUT	/list_budget/<id>/	Actualizar	update(self, request)
# PATCH	/list_budget/<id>/	Actualizar parcial	partial_update()
# DELETE	/list_budget/<id>/	Eliminar	destroy(self, request)
class ListBudgetViewSet(viewsets.ModelViewSet):
    queryset = ListBudget.objects.all()
    serializer_class = ListBudgetSerializer
    permission_classes = [IsAuthenticated]
   

    def get_queryset(self):
        lista_id = self.request.query_params.get('lista')  # `lista` viene del nombre del campo FK
        if (lista_id):
            return self.queryset.filter(lista_id=lista_id)
        return self.queryset




# Método HTTP	URL	Acción	Método en la clase
# GET	/following/	Listar	list(self, request)
# POST	/following/	Crear	create(self, request)
# GET	/following/<id>/	Obtener uno	retrieve(self, request) 
# PUT	/following/<id>/	Actualizar	update(self, request)
# PATCH	/following/<id>/	Actualizar parcial	partial_update()
# DELETE	/following/<id>/	Eliminar	destroy(self, request)
class FollowingViewSet(viewsets.ModelViewSet):
    queryset = Following.objects.all()  # Define el queryset aquí
    serializer_class = FollowingSerializer
    permission_classes = [IsAuthenticated]


    def get_queryset(self):
        """
        Si es admin, devuelve todos los seguimientos.
        Si no, solo devuelve los seguimientos del usuario autenticado.
        """
        user = self.request.user
        list_name = self.request.query_params.get('name')
        usuario = self.request.query_params.get('usuario')

        if usuario and user.is_staff:
            return self.queryset.filter(user=usuario)
        else:
            if user.is_staff:  # Verifica si el usuario es admin
                return self.queryset.all()
            else:
                if list_name:
                    return self.queryset.filter(user=user, name=list_name)
                return self.queryset.filter(user=user)

    def perform_create(self, serializer):
        """
        Asignar automáticamente el usuario autenticado al crear.
        """
        serializer.save(user=self.request.user)


# Metodo HTTP	URL	Acción	Método en la clase
# GET	/list_following/	Listar	list(self, request)
# POST	/list_following/	Crear	create(self, request)
# GET	/list_following/<id>/	Obtener uno	retrieve(self, request)
# PUT	/list_following/<id>/	Actualizar	update(self, request)
# PATCH	/list_following/<id>/	Actualizar parcial	partial_update()
# DELETE	/list_following/<id>/	Eliminar	destroy(self, request)

class ListFollowingViewSet(viewsets.ModelViewSet):
    queryset = ListFollowing.objects.all()
    serializer_class = ListFollowingSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        """
        DELETE /app/lists_following/?lista=7&item=35
        O bien DELETE /app/lists_following/{pk}/
        """
        lista = request.query_params.get('lista')
        item  = request.query_params.get('item')

        if lista is not None and item is not None:
            # Borrado por lista+item
            qs = self.get_queryset().filter(lista=lista, item=item)
            if not qs.exists():
                return Response(
                    {"error": "No existe esa relación lista–item"},
                    status=status.HTTP_404_NOT_FOUND
                )
            qs.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # Fallback: borrado por PK
        return super().destroy(request, *args, **kwargs)


# Metodo HTTP	URL	Acción	Método en la clase
# GET	/suppliers/	Listar	list(self, request)
# POST	/suppliers/	Crear	create(self, request)
# GET	/suppliers/<id>/	Obtener uno	retrieve(self, request)
# PUT	/suppliers/<id>/	Actualizar	update(self, request)
# PATCH	/suppliers/<id>/	Actualizar parcial	partial_update()
# DELETE	/suppliers/<id>/	Eliminar	destroy(self, request)
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]



class CategoryAmazonAPIView(APIView):
    
    permission_classes = [IsAuthenticated]  # Puedes limitar acceso si quieres

    def get(self, request):
        categories = [
            {"value": cat.value, "label": cat.label}
            for cat in CategoryAmazon
        ]
        return Response(categories)
    
class CategoryAlibabaAPIView(APIView):
    permission_classes = [IsAuthenticated]  # Puedes limitar acceso si quieres

    def get(self, request):
        categories = [
            {"value": cat.value, "label": cat.label}
            for cat in CategoryAlibaba
        ]
        return Response(categories) 

class CheckAlertsAPIView(APIView):
    permission_classes=[IsAuthenticated]
    """
    Vista DRF que chequea TODAS las alertas definidas en el modelo Alert
    y devuelve un JSON con las que se cumplen actualmente.
    """

    def get(self, request, *args, **kwargs):
        hoy = timezone.now().date()
        all_alerts = Alert.objects.filter(user=request.user)
        resultados = []

        for alerta in all_alerts:
            if hoy <= alerta.end_date:
                if alerta.item_alibaba:
                    # Verificar si la alerta de Alibaba se cumple
                    result = self.check_alibaba_alert(alerta)
                    if result:
                        resultados.append(result)
                elif alerta.item_amazon:
                    # Verificar si la alerta de Amazon se cumple
                    result = self.check_amazon_alert(alerta)
                    if result:
                        resultados.append(result)

        return Response(resultados, status=status.HTTP_200_OK)


    def check_alibaba_alert(self, alerta):
        """
        Verifica si la alerta de Alibaba se cumple:
        - Se busca el último registro de PriceHistory para item_alibaba y rango
        - Se compara con 'min_price'
        - Retorna un dict si se cumple, o None si no.
        """
        if not alerta.min_price:
            return None  # si no hay min_price no hay nada que chequear

        # Filtro por item_alibaba y rango (si existe). 
        # Si la alerta guarda la FK 'rango', podemos usar alerta.rango_id.
        ph_qs = PriceHistory.objects.filter(item_alibaba=alerta.item_alibaba)
        if alerta.rango:
            ph_qs = ph_qs.filter(rango=alerta.rango)

       

        # Obtener el más reciente (fecha mayor)
        ph = ph_qs.order_by('-date').first()
        if not ph:
            return None
       
        # Comparar
        if ph.current_price < alerta.min_price:
            
            return {
                "alert_id": alerta.pk,
                "item_alibaba": alerta.item_alibaba.pk,
                "mensaje": (
                    f"{alerta.item_alibaba.title}: Precio actual ({ph.current_price}) "
                    f"es menor que min_price ({alerta.min_price})."
                )
            }

        return None


    def check_amazon_alert(self, alerta):
        """
        Verifica si la alerta de Amazon se cumple:
        - Se busca el último registro de PriceHistory para item_amazon
        - Se compara con 'max_price'
        - Retorna un dict si se cumple, o None si no.
        """
        if not alerta.max_price:
            return None

        # Filtro por item_amazon
        ph_qs = PriceHistory.objects.filter(item_amazon=alerta.item_amazon)
        ph = ph_qs.order_by('-date').first()
        if not ph:
            return None

        if ph.current_price > alerta.max_price:
            return {
                "alert_id": alerta.pk,
                "item_amazon": alerta.item_amazon.pk,
                "mensaje": (
                    f"{alerta.item_amazon.title}: Precio actual ({ph.current_price}) "
                    f"excede max_price ({alerta.max_price})."
                )
            }

        return None


class ProductAttributesViewSet(viewsets.ModelViewSet):
    queryset = ProductAttribute.objects.all()
    serializer_class = ProductAttributeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        item_amazon_id = self.request.query_params.get('item_amazon')
        item_alibaba_id = self.request.query_params.get('item_alibaba')

        if item_amazon_id:
            queryset = queryset.filter(item_amazon_id=item_amazon_id)
        elif item_alibaba_id:
            queryset = queryset.filter(item_alibaba_id=item_alibaba_id)

        return queryset


@api_view(['GET'])
def compare_items(request):
    """
    GET /api/compare-items/?item1=37&item2=42
    Opcional: &item2_url=https://... de Alibaba
    """
    item1_id   = request.query_params.get('item1')
    item2_id   = request.query_params.get('item2')
    item2_url  = request.query_params.get('item2_url')

    if not item1_id or not (item2_id or item2_url):
        return Response({'error': 'Faltan parámetros item1 o item2'}, status=400)

    # 1) Atributos del item1 (Amazon)
    qs1   = ProductAttribute.objects.filter(item_amazon_id=item1_id)
    attrs1 = {a.name: a.value for a in qs1}


    # 2) Atributos del item2 (Alibaba o BD)
    if item2_url:
        result = scrape_alibaba.scrape_alibaba_attributes(item2_url)
        raw_attrs = result.get('attributes', [])
        attrs2 = {clean_text(k): clean_text(v) for k, v in raw_attrs}
    else:
        qs2 = ProductAttribute.objects.filter(item_alibaba_id=item2_id)
        attrs2 = {clean_text(a.name): clean_text(a.value) for a in qs2}

    # 3) Calcular features y similitud global
    features = extract_features(attrs1, attrs2)

    return Response({
        'attrs1': attrs1,
        'attrs2': attrs2,
        'features': features,
    })