import re, requests, unicodedata
from bs4 import BeautifulSoup

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
