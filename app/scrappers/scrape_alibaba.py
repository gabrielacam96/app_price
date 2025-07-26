# scraper_alibaba.py — archivo optimizado completamente
# - Context managers para Selenium y undetected-chromedriver
# - Cierre garantizado de procesos de driver
# - Reintento seguro y máximo de scroll para listas largas

import json
import re
import logging
import time
import random
from contextlib import contextmanager
from django.http import JsonResponse
import requests
from bs4 import BeautifulSoup
from urllib.parse import quote_plus, unquote
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
import undetected_chromedriver as uc

logger = logging.getLogger(__name__)

@contextmanager
def selenium_driver():
    """Context manager para Chrome oficial con headless y bloqueos."""
    opts = Options()
    opts.add_argument("--headless")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-webgl")
    opts.page_load_strategy = "eager"
    # Bloquear recursos innecesarios
    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.managed_default_content_settings.stylesheets": 2,
        "profile.managed_default_content_settings.fonts": 2,
    }
    opts.add_experimental_option("prefs", prefs)
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=opts)
    try:
        yield driver
    finally:
        try:
            driver.quit()
        except Exception as e:
            logger.warning(f"[selenium_driver] error closing driver: {e}")

@contextmanager
def uc_driver():
    """Context manager para undetected-chromedriver con headless y anti-detección."""
    options = uc.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    driver = uc.Chrome(options=options)
    try:
        yield driver
    finally:
        try:
            driver.quit()
        except Exception as e:
            logger.warning(f"[uc_driver] error closing UC driver: {e}")


def _parse_soup(soup):
    """Extrae atributos y rangos de una página de producto Alibaba."""
    attrs = []
    for row in soup.select("div.attribute-item"):
        k = row.select_one("div.left")
        v = row.select_one("div.right span")
        if k and v:
            attrs.append((k.get_text(strip=True), v.get_text(strip=True)))
    ranges = []
    for block in soup.select("div.price-item"):
        u_el = block.select_one("div.quality")
        p_el = block.select_one("div.price")
        if not (u_el and p_el):
            children = block.find_all("div", recursive=False)
            if len(children) >= 2:
                u_el = u_el or children[0]
                p_el = p_el or children[1]
        if not (u_el and p_el):
            continue
        unidades = re.sub(r"[^\d\-]", "", u_el.get_text(" ", strip=True))
        precio = re.sub(r"[^\d,.]", "", p_el.get_text(strip=True)).replace(",", ".")
        ranges.append({"rango_unidades": unidades, "rango_precio": precio})
    return attrs, ranges


def scrape_alibaba_attributes(url: str, timeout: float = 3, poll: float = 0.5):
    """Intenta extraer atributos y rangos con requests, JSON embebido o Selenium."""
    headers = {"User-Agent": "Mozilla/5.0"}
    # 1) requests + BS
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "html.parser")
        attrs, ranges = _parse_soup(soup)
        if attrs or ranges:
            return {"attributes": attrs, "ranges": ranges}
    except Exception:
        pass
    # 2) JSON embebido
    try:
        m = re.search(r"window\\.runParams\\s*=\\s*({.*?});", resp.text, re.DOTALL)
        if m:
            data = json.loads(m.group(1))
            specs = data.get("detailModule", {}).get("specsKeyTabModule", {}).get("specsKeyTab", [])
            attrs = [(s.get("title"), s.get("valueTitle")) for s in specs if s.get("title")]
            ladder = data.get("detailModule", {}).get("ladderPriceModule", {}).get("ladderPriceList", [])
            ranges = []
            for i in ladder:
                u = re.sub(r"[^\d\-]", "", i.get("range", ""))
                p = str(i.get("price", "")).replace(",", ".")
                if u and p:
                    ranges.append({"rango_unidades": u, "rango_precio": p})
            if attrs or ranges:
                return {"attributes": attrs, "ranges": ranges}
    except Exception as e:
        logger.warning(f"[JSON fallback] failed for {url}: {e}")
    # 3) Selenium
    try:
        with selenium_driver() as drv:
            drv.get(url)
            WebDriverWait(drv, timeout, poll).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.attribute-item"))
            )
            soup = BeautifulSoup(drv.page_source, "html.parser")
            attrs, ranges = _parse_soup(soup)
            return {"attributes": attrs, "ranges": ranges}
    except Exception as e:
        logger.error(f"[Selenium] error on {url}: {e}")
        return {"attributes": [], "ranges": []}


def _scroll_until(driver, selector: str, min_count: int = 20, max_scrolls: int = 8):
    """Hace scroll hasta que haya al menos min_count elementos matching selector."""
    last = 0
    for _ in range(max_scrolls):
        cur = len(driver.find_elements(By.CSS_SELECTOR, selector))
        if cur >= min_count or cur == last:
            break
        last = cur
        driver.execute_script("window.scrollBy(0, window.innerHeight*0.9)")
        WebDriverWait(driver, 2).until(lambda d: len(d.find_elements(By.CSS_SELECTOR, selector)) > cur)


def scrape_alibaba_products(consulta, categoria):
    """Extrae productos usando Selenium para búsqueda por texto."""
    if not consulta:
        return JsonResponse({"error": "Falta parámetro consulta"}, status=400)
    url = f"https://spanish.alibaba.com/trade/search?SearchText={quote_plus(consulta)}"
    if categoria:
        url += f"&categoryId={categoria}"
    try:
        with selenium_driver() as drv:
            drv.get(url)
            _scroll_until(drv, ".fy23-search-card, .fy24-search-card", min_count=20)
            soup = BeautifulSoup(drv.page_source, "lxml")
            productos = extract_product_info(soup, max_items=20)
            return JsonResponse({"resultados": productos})
    except Exception as e:
        logger.error(f"[products] error: {e}")
        return JsonResponse({"error": str(e)}, status=500)


def scrape_alibaba_by_image(image_url):
    """Busca productos por imagen usando undetected-chromedriver."""
    image_url = unquote(image_url)
    try:
        with uc_driver() as drv:
            drv.get("https://spanish.alibaba.com/")
            wait = WebDriverWait(drv, 10)
            close_gdpr_popup(drv, wait)
            click_camera_button(drv, wait)
            upload_image(wait, image_url)
            wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, ".fy23-search-card, .fy24-search-card")) > 0)
            soup = BeautifulSoup(drv.page_source, "html.parser")
            productos = extract_product_info(soup, max_items=20)
            return JsonResponse({"resultados": productos})
    except Exception as e:
        logger.error(f"[by_image] error: {e}")
        return JsonResponse({"error": str(e)}, status=500)


def close_gdpr_popup(driver, wait):
    try:
        btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(@class,'gdpr-btn') and contains(@class,'gdpr-agree-btn')]")) )
        btn.click()
        time.sleep(1)
    except Exception:
        pass


def click_camera_button(driver, wait):
    btn = wait.until(EC.presence_of_element_located((By.XPATH, "//div[contains(@class,'search-bar-picture')]")))
    driver.execute_script("arguments[0].scrollIntoView();", btn)
    time.sleep(0.5)
    btn.click()


def upload_image(wait, url):
    inp = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input.image-upload-link-url")))
    inp.clear(); inp.send_keys(url)
    btn = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button.image-upload-link-search")))
    btn.click()
    time.sleep(random.uniform(1, 3))


def filtrar_rating(texto):
    m = re.search(r"\d+\.\d+", texto)
    return float(m.group()) if m else None


def extract_product_info(soup, max_items=20):
    prods = []
    cards = soup.select(".fy23-search-card, .fy24-search-card")[:max_items]
    for c in cards:
        prods.append({
            "titulo": extract_title(c),
            "url": extract_url(c),
            "precio": extract_price(c),
            "orden_minima": extract_min_order(c),
            "imagen": extract_image(c),
            "empresa": extract_company(c),
            "valoracion": filtrar_rating(extract_rating(c)),
        })
    return prods

# Funciones auxiliares de extracción (sin cambios importantes)

def extract_title(p): return p.find("h2", class_="search-card-e-title").get_text(strip=True) if p.find("h2", class_="search-card-e-title") else "Sin título"
def extract_url(p):
    a = p.find("a", href=True)
    if a:
        u = a["href"]
        return ("https:" + u if u.startswith("//") else u).replace(".com", ".es")
    return None

def extract_price(p):
    d = p.find("div", class_="search-card-e-price-main")
    if not d: return "No disponible"
    txt = re.sub(r"[^\d,.-]", "", d.get_text(strip=True))
    parts = txt.split("-")
    try:
        if len(parts)==2:
            return f"€{float(parts[0].replace(',','.'))} - €{float(parts[1].replace(',','.'))}"
        return f"€{float(parts[0].replace(',','.'))}"
    except:
        return "No disponible"

def extract_min_order(p):
    o = p.find("div", class_="search-card-m-sale-features__item")
    return re.search(r"\d+", o.get_text()) and re.search(r"\d+", o.get_text()).group() if o else "No disponible"

def extract_image(p): return p.find("img")["src"] if p.find("img") else None
def extract_company(p): return p.find("a", class_="search-card-e-company margin-bottom-8").get_text(strip=True) if p.find("a", class_="search-card-e-company margin-bottom-8") else "Sin empresa"
def extract_rating(p): return p.find("span", class_="search-card-e-review").get_text(strip=True) if p.find("span", class_="search-card-e-review") else ""
