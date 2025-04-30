import unicodedata
import re

def clean_text(text: str) -> str:
    """
    Normaliza una cadena:
     - Elimina diacríticos (tildes, eñes, etc.)
     - Convierte a minúsculas
     - Sustituye caracteres no alfanuméricos (excepto espacios) por nada
     - Colapsa espacios múltiples

    Ejemplo:
        clean_text("Número de piezas: 16")  -> "numero de piezas 16"
    """
    # 1. Unicode NFKD para separar caracteres base de sus diacríticos
    text = unicodedata.normalize('NFKD', text)
    # 2. Eliminar marcas diacríticas (combining marks)
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    # 3. Convertir a minúsculas
    text = text.lower()
    # 4. Quitar todo lo que no sea letra, número o espacio
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    # 5. Colapsar múltiples espacios y recortar
    text = re.sub(r'\s+', ' ', text).strip()
    return text
