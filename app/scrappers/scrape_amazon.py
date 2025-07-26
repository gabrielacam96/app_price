import re, requests, unicodedata
from bs4 import BeautifulSoup
from urllib.parse import urlencode
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.ERROR)

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123 Safari/537.36"
def _extract_li_pairs(ul) -> list[tuple[str, str]]:
    """
    Lee la variante 'clave en un li, valor en el siguiente'.
    """
    pares = []
    current_key = None

    for li in ul.select("> li"):
        bold   = li.select_one("span.a-text-bold, span.a-size-small.a-color-base.a-text-bold")
        normal = li.select_one("span.a-size-base.a-color-secondary, span.a-size-base.a-color-base")

        if bold:
            # hemos encontrado la clave; guardamos
            current_key = bold.get_text(" ", strip=True).rstrip(":")
        elif normal and current_key:
            # tenemos el valor: unimos con la clave previa
            value = normal.get_text(" ", strip=True)
            pares.append((current_key, value))
            current_key = None

    return pares

def scrape_amazon_attributes(url, timeout=8):
    resp = requests.get(url, headers={"User-Agent": UA}, timeout=timeout)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.content, "lxml")

    attrs = []

    # 1) Tabla clásica --------------------------------------------------------
    table = soup.select_one("table.a-normal.a-spacing-micro")
    if table:
        for tr in table.select("tr"):
            tds = tr.select("td")
            if len(tds) >= 2:
                attrs.append((
                    tds[0].get_text(" ", strip=True).rstrip(":"),
                    tds[1].get_text(" ", strip=True),
                ))

    # 2) opcion -----------------------------------------
    if not attrs:
        for detail in soup.select("div.product-facts-detail"):
            key_span = detail.select_one("div.a-col-left span")
            val_span = detail.select_one("div.a-col-right span")

            if key_span and val_span:
                key = key_span.get_text(" ", strip=True).rstrip(":")
                val = val_span.get_text(" ", strip=True)
                attrs.append((key, val))
         

    # 3) opcion ----------------------------------
    if not attrs:
        ul = soup.select_one("#productOverview_feature_div ul.a-nostyle")
        if ul:
            attrs = _extract_li_pairs(ul)

    if not attrs:
        raise ValueError("No se encontraron atributos en la página")

    return attrs

################################################

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
            label_attr = rating_anchor.get("aria-label", "")
            # Ej: "4,5 de 5 estrellas, 130.186 calificaciones"
            import re
            m = re.search(r"([\d,]+)\s+de\s+5\s+estrellas", label_attr)
            if m:
                stars = float(m.group(1).replace(",", "."))

            m2 = re.search(r"([\d\.]+)\s+calificaciones", label_attr)
            if m2:
                reviews = int(m2.group(1).replace(".", ""))

            rating = stars  # Usamos rating como sinónimo de estrellas


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


def scrape_amazon_products(query, category, tendencia):

    from rest_framework.response import Response
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.chrome.options import Options
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.common.by import By

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

