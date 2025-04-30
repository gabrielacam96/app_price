import json
import numpy as np
import pandas as pd
from difflib import SequenceMatcher
from sklearn.ensemble import RandomForestClassifier
from django.utils import timezone
from django.db.models import Max
from django.http import JsonResponse
from ..app.models import ItemAlibaba, ItemAmazon,Alert,PriceHistory
from decimal import Decimal

def similarity_ratio(text1, text2):
    """ Calcula la similitud entre dos textos. """
    if isinstance(text1, str) and isinstance(text2, str):
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    return 0

def generate_training_data(attributes, num_samples=100):
    """ Genera datos de entrenamiento basados en similitudes realistas. """
    training_data = []
    
    for _ in range(num_samples):
        data_point = {key + "_similarity": round(np.random.uniform(0.4, 1.0) if np.random.rand() > 0.5 else np.random.uniform(0.0, 0.3), 2) for key in attributes}
        
        # Etiquetado automático basado en promedio de similitud
        avg_similarity = np.mean(list(data_point.values()))
        data_point["label"] = 1 if avg_similarity > 0.5 else 0  # 1 = Similar, 0 = No similar
        
        training_data.append(data_point)
    
    return pd.DataFrame(training_data)

def comparar_productos(amazon_product, alibaba_product):
    """ Compara dos productos y devuelve si son similares. """
    common_keys = set(amazon_product.keys()) & set(alibaba_product.keys())

    similarity_data = {key + "_similarity": similarity_ratio(amazon_product[key], alibaba_product[key]) for key in common_keys}
    X_test = pd.DataFrame([similarity_data])

    # Generar datos de entrenamiento dinámicamente
    df_train = generate_training_data(common_keys)
    X_train = df_train.drop(columns=["label"])
    y_train = df_train["label"]

    # Asegurar que las características en X_test coincidan con las del modelo
    X_test = X_test.reindex(columns=X_train.columns, fill_value=0)

    # Entrenar modelo RandomForest
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X_train, y_train)

    # Hacer predicción
    prediction = model.predict(X_test)[0]
    prediction_proba = model.predict_proba(X_test)[0][1]

    return {
        "similarity_score": round(prediction_proba, 2),
        "is_similar": bool(prediction)
    }




def check_all_alerts(request):
    """
    Consulta las alertas almacenadas en el modelo 'Alert',
    verifica cuáles siguen vigentes y si se cumplen las condiciones
    de precio en PriceHistory.
    Devuelve un JSON con la lista de alertas cumplidas.
    """
    hoy = timezone.now().date()

    # Traemos todas las alertas. Podrías filtrar por usuario si quieres algo como:
    # .filter(user=request.user)
    all_alerts = Alert.objects.all()

    resultados = []

    for alerta in all_alerts:
        # 1) Chequear vigencia (fecha actual <= end_date)
        if hoy <= alerta.end_date:
            # Verificamos si es de tipo Alibaba o Amazon
            if alerta.item_alibaba:
                # Chequear min_price con el último precio para ese item + rango (si procede)
                alert_cumplida = check_alibaba_alert(alerta)
                if alert_cumplida:
                    resultados.append(alert_cumplida)

            elif alerta.item_amazon:
                # Chequear max_price con el último precio para ese item Amazon
                alert_cumplida = check_amazon_alert(alerta)
                if alert_cumplida:
                    resultados.append(alert_cumplida)

    return JsonResponse({"alertas_cumplidas": resultados}, status=200, safe=False)


def check_alibaba_alert(alerta):
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
        ph_qs = ph_qs.filter(rango=alerta.id)

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
                f"Alerta {alerta.pk}: Precio actual ({ph.current_price}) "
                f"es menor que min_price ({alerta.min_price})."
            )
        }

    return None


def check_amazon_alert(alerta):
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
                f"Alerta {alerta.pk}: Precio actual ({ph.current_price}) "
                f"excede max_price ({alerta.max_price})."
            )
        }

    return None
    
