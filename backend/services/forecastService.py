import requests
from .caching import cache_response, get_cached_response


class ForecastClient:
    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def get_hourly_forecast(self, latitude, longitude, start_date, end_date):  # hourly weather forecast fetch
        cache_key = f"forecast_{latitude}_{longitude}_{start_date}_{end_date}"
        cached_data = get_cached_response(cache_key)  # it will check that if the cache is exist or not

        if cached_data:
            return cached_data  # if cache is exist then we dont need api call

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": "temperature_2m,precipitation,relative_humidity_2m," "windspeed_10m",
            "timezone": "auto",
        }

        try:
            response = requests.get(self.BASE_URL, params=params)  # call api
            response.raise_for_status()
            data = response.json()  # convert JSON response to python dict ...

            cache_response(
                cache_key, data, expiry_hours=1
            )  # The data coming from the API is being cached → for 1 hour
            # Then the data is being returned.That is, if you make the same request
            # within the next 1 hour, you will get the data from the cache faster.
            return data

        except requests.exceptions.RequestException as e:  # if any exception arise
            print(f"Error fetching forecast data: {e}")
            return None
