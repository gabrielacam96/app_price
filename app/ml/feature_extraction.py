import difflib

def extract_features(attrs1: dict, attrs2: dict, key_threshold=0.6):
    keys1 = list(attrs1.keys())
    keys2 = list(attrs2.keys())
    union_keys = set(keys1) | set(keys2)

    # 1. Emparejamiento difuso de claves
    matches = {}
    used2 = set()
    for k1 in keys1:
        best = (None, 0.0)
        for k2 in keys2:
            if k2 in used2:
                continue
            sim = difflib.SequenceMatcher(None, k1.lower(), k2.lower()).ratio()
            if sim > best[1]:
                best = (k2, sim)
        if best[1] >= key_threshold:
            matches[k1] = best
            used2.add(best[0])

    n_matched = len(matches)
    n_union = len(union_keys)
    ratio_key_matched = n_matched / n_union if n_union else 1.0
    avg_key_sim = sum(sim for _, sim in matches.values()) / n_matched if n_matched else 0.0

    # 2. Semejanza de valores en pares emparejados
    value_sims = []
    for k1, (k2, _) in matches.items():
        v1, v2 = attrs1[k1], attrs2[k2]
        sim = difflib.SequenceMatcher(None, v1.lower(), v2.lower()).ratio()
        value_sims.append(sim)
    avg_value_sim = sum(value_sims) / len(value_sims) if value_sims else 0.0

    # 3. Penalización por atributos sin emparejar
    n_unmatched = n_union - n_matched
    unmatched_penalty = n_unmatched / n_union if n_union else 0.0

    # 4. Similitud global
    # Combina el ratio de claves emparejadas con la similitud de valores
    # de modo que si no hay claves emparejadas el global sea 0,
    # y si todas las claves están emparejadas sea promedio de sims de clave y valor.
    if n_union:
        global_similarity = ratio_key_matched * ((avg_key_sim + avg_value_sim) / 2)
    else:
        global_similarity = 1.0

    return {
        'ratio_key_matched': ratio_key_matched,
        'avg_key_sim': avg_key_sim,
        'avg_value_sim': avg_value_sim,
        'unmatched_penalty': unmatched_penalty,
        'global_similarity': global_similarity
    }
