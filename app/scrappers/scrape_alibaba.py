# app/scrapers/alibaba_scraper.py

import json
import re
import logging
import requests
from bs4 import BeautifulSoup
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

logger = logging.getLogger(__name__)

# Suponemos que _DRIVER ya se inicializa una vez en este módulo:
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

_opts = Options()
_opts.add_argument("--headless")
_opts.add_argument("--disable-gpu")
_prefs = {
    "profile.managed_default_content_settings.images":       2,
    "profile.managed_default_content_settings.stylesheets":  2,
    "profile.managed_default_content_settings.fonts":        2,
}
_opts.add_experimental_option("prefs", _prefs)
_service = Service(ChromeDriverManager().install())
_DRIVER = webdriver.Chrome(service=_service, options=_opts)


def _parse_soup(soup):
    """
    Extrae:
      - attrs: [(key, value), …]
      - ranges: [{"rango_unidades": "10-23", "rango_precio": "2.79"}, …]
    """
    # —— Atributos clave —— 
    attrs = []
    for row in soup.select("div.attribute-item"):
        k_el = row.select_one("div.left")
        v_el = row.select_one("div.right span")
        if k_el and v_el:
            key   = k_el.get_text(strip=True)
            value = v_el.get_text(strip=True)
            attrs.append((key, value))

    # —— Ranges —— 
    ranges = []
    for block in soup.select("div.price-item"):
        # intento oficial
        u_el = block.select_one("div.quality")
        p_el = block.select_one("div.price")

        # fallback: dos divs hijos
        if not (u_el and p_el):
            children = [d for d in block.find_all("div", recursive=False)]
            if len(children) >= 2:
                u_el = u_el or children[0]
                p_el = p_el or children[1]

        if not (u_el and p_el):
            continue

        # limpiar unidades
        raw_u = u_el.get_text(" ", strip=True)
        unidades = re.sub(r"[^\d\-]", "", raw_u)

        # limpiar precio (primer span o todo el texto)
        spans = p_el.find_all("span")
        raw_p = spans[0].get_text(strip=True) if spans else p_el.get_text(strip=True)
        precio = re.sub(r"[^\d,\.]", "", raw_p).replace(",", ".")

        ranges.append({
            "rango_unidades": unidades,
            "rango_precio": precio,
        })

    return attrs, ranges


def scrape_alibaba_attributes(url: str, timeout: float = 3, poll_frequency: float = 0.5):
    """
    Devuelve {"attributes": [...], "ranges": [...]}
    con tres métodos de extracción:
      1) requests + BS
      2) JSON embebido (window.runParams)
      3) Selenium fallback
    """
    headers = {"User-Agent": "Mozilla/5.0"}
    # ——————————————————————————
    # 1) Requests + BS
    # ——————————————————————————
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.content, "html.parser")
        attrs, ranges = _parse_soup(soup)
        if attrs or ranges:
            return {"attributes": attrs, "ranges": ranges}
    except Exception:
        pass

    # ——————————————————————————
    # 2) JSON embebido
    # ——————————————————————————
    try:
        text = resp.text
        m = re.search(r"window\.runParams\s*=\s*({.*?});", text, re.DOTALL)
        if m:
            data = json.loads(m.group(1))
            specs = (data.get("detailModule", {})
                         .get("specsKeyTabModule", {})
                         .get("specsKeyTab", []))
            attrs = [(s.get("title"), s.get("valueTitle"))
                     for s in specs
                     if s.get("title") and s.get("valueTitle")]

            # Rangos aparecen en detailModule.ladderPriceModule.ladderPriceList
            ladder = (data.get("detailModule", {})
                         .get("ladderPriceModule", {})
                         .get("ladderPriceList", []))
            ranges = []
            for item in ladder:
                unidades = re.sub(r"[^\d\-]", "", item.get("range", ""))
                precio   = str(item.get("price", "")).replace(",", ".")
                if unidades and precio:
                    ranges.append({"rango_unidades": unidades, "rango_precio": precio})

            if attrs or ranges:
                return {"attributes": attrs, "ranges": ranges}
    except Exception as e:
        logger.warning(f"[Alibaba Scraper] JSON fallback failed for {url}: {e}")

    # ——————————————————————————
    # 3) Selenium fallback
    # ——————————————————————————
    try:
        _DRIVER.get(url)
        WebDriverWait(_DRIVER, timeout, poll_frequency).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.attribute-item"))
        )
        soup = BeautifulSoup(_DRIVER.page_source, "html.parser")
        attrs, ranges = _parse_soup(soup)
        if not (attrs or ranges):
            logger.warning(f"[Alibaba Scraper] Selenium cargó pero no encontró datos en {url}")
        return {"attributes": attrs, "ranges": ranges}
    except Exception as e:
        logger.error(f"[Alibaba Scraper] Selenium error on {url}: {str(e).splitlines()[0]}")
        return {"attributes": [], "ranges": []}
