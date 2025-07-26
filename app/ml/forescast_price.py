import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

def forecast_price_json(item_prices, months=6):
    """
    item_prices: lista de dicts con {'date': 'YYYY-MM-DD', 'current_price': valor}
    months: número de meses a predecir
    """
    # 1. Construimos DataFrame y limpiamos
    df = pd.DataFrame(item_prices)
    df['date'] = pd.to_datetime(df.get('date'), errors='coerce')
    df['current_price'] = pd.to_numeric(df.get('current_price'), errors='coerce')
    df = df.dropna(subset=['date', 'current_price'])

    if df.empty:
        return {"dates": [], "prices": []}

    # 2. Agrupamos y obtenemos una Series con índice datetime
    df = df.set_index('date')
    # En caso de duplicados en una fecha, promediamos
    series = df['current_price'].groupby(level=0).mean().sort_index()

    # 3. Si hay menos de 6 puntos, no predecimos
    if len(series) < 6:
        return {"dates": [], "prices": []}

    # 4. Resample mensual y rellenamos huecos
    series = series.resample('MS').mean().interpolate()

    # 5. Entrenamos Holt–Winters
    try:
        if len(series) >= 24:
            model = ExponentialSmoothing(
                series, trend="add", seasonal="add", seasonal_periods=12
            )
        else:
            model = ExponentialSmoothing(series, trend="add", seasonal=None)
        fitted = model.fit(optimized=True)
    except Exception as e:
        # Fallback sin estacionalidad
        print("⚠️ HoltWinters fallo:", e)
        model = ExponentialSmoothing(series, trend="add", seasonal=None)
        fitted = model.fit(optimized=True)

    # 6. Forecast
    forecast = fitted.forecast(months)
    # Limpiamos NaN/infinito
    forecast = forecast.replace([np.nan, np.inf, -np.inf], series.iloc[-1])

    # 7. Formateamos salida
    return {
        "dates": [d.strftime("%Y-%m-%d") for d in forecast.index],
        "prices": [round(float(p), 2) for p in forecast.values]
    }
