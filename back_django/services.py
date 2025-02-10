import json
import numpy as np
import pandas as pd
from difflib import SequenceMatcher
from sklearn.ensemble import RandomForestClassifier

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
