import requests
from .caching import cache_response, get_cached_response


class ForecastClient:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def get_hourly_forecast(self, latitude, longitude, start_date, end_date):
        cache_key = f"forecast_{latitude}_{longitude}_{start_date}_{end_date}"
        cached_data = get_cached_response(cache_key)

        if cached_data:
            return cached_data

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": "temperature_2m,precipitation,relative_humidity_2m," "windspeed_10m",
            "timezone": "auto",
        }

        try:
            response = requests.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

            cache_response(cache_key, data, expiry_hours=1)
            return data

        except requests.exceptions.RequestException as e:
            print(f"Error fetching forecast data: {e}")
            return None
