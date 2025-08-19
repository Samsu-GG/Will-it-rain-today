import requests
from .caching import cache_response, get_cached_response


class NasaPowerClient:
    HOURLY_BASE_URL = "https://power.larc.nasa.gov/api/temporal/hourly/point"
    DAILY_BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

    def __init__(self):
        self.hourly_parameters = "T2M,PRECTOTCORR,WS2M,RH2M"
        self.daily_parameters = "T2M,PRECTOT,WS2M"

    def get_hourly_weather_data(self, latitude, longitude, start_date, end_date):
        print(f"🚀 NASA Hourly Client called: lat={latitude}, lon={longitude}, start={start_date}, end={end_date}")

        cache_key = f"hourly_{latitude}_{longitude}_{start_date}_{end_date}"
        cached_data = get_cached_response(cache_key)

        if cached_data:
            print(f"📦 Using cached hourly data for {cache_key}")
            return cached_data

        params = {
            "parameters": self.hourly_parameters,
            "start": start_date,
            "end": end_date,
            "latitude": latitude,
            "longitude": longitude,
            "community": "AG",
            "format": "JSON",
        }

        print(f"🌐 Making NASA Hourly API request: {params}")
        print(f"🔗 URL: {self.HOURLY_BASE_URL}?{'&'.join([f'{k}={v}' for k, v in params.items()])}")

        try:
            # Add timeout to prevent hanging
            response = requests.get(self.HOURLY_BASE_URL, params=params, timeout=15)
            print(f"📡 NASA Hourly API Response Status: {response.status_code}")

            if response.status_code != 200:
                print(f"❌ NASA Hourly API Error Status: {response.status_code}")
                print(f"❌ Error Response: {response.text[:200]}...")  # First 200 chars
                return None

            response.raise_for_status()
            data = response.json()

            # Debug the response
            print(f"✅ NASA Hourly Data received, type: {type(data)}")
            if data:
                print(f"📊 Data keys: {list(data.keys())}")
                if "properties" in data and "parameter" in data["properties"]:
                    params_available = list(data["properties"]["parameter"].keys())
                    print(f"📈 Parameters available: {params_available}")

                    # Check if we have temperature data
                    if "T2M" in data["properties"]["parameter"]:
                        temp_data = data["properties"]["parameter"]["T2M"]
                        hours_with_data = [k for k, v in temp_data.items() if v is not None]
                        print(f"⏰ Hours with temperature data: {len(hours_with_data)}")
                        if hours_with_data:
                            print(f"📅 Sample time keys: {hours_with_data[:3]}")  # First 3 keys

            cache_response(cache_key, data)
            print(f"💾 Cached hourly data for {cache_key}")
            return data

        except requests.exceptions.Timeout:
            print("⏰ NASA Hourly API request timed out after 15 seconds")
            return None
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching hourly data from NASA POWER API: {e}")
            return None
        except Exception as e:
            print(f"💥 Unexpected error in NASA hourly client: {e}")
            import traceback

            traceback.print_exc()
            return None

    def get_daily_weather_data(self, latitude, longitude, start_date, end_date):
        print(f"🚀 NASA Daily Client called: lat={latitude}, lon={longitude}, start={start_date}, end={end_date}")

        cache_key = f"daily_{latitude}_{longitude}_{start_date}_{end_date}"
        cached_data = get_cached_response(cache_key)

        if cached_data:
            print(f"📦 Using cached daily data for {cache_key}")
            return cached_data

        params = {
            "parameters": self.daily_parameters,
            "start": start_date,
            "end": end_date,
            "latitude": latitude,
            "longitude": longitude,
            "community": "AG",
            "format": "JSON",
        }

        print(f"🌐 Making NASA Daily API request: {params}")

        try:
            response = requests.get(self.DAILY_BASE_URL, params=params, timeout=15)
            print(f"📡 NASA Daily API Response Status: {response.status_code}")

            if response.status_code != 200:
                print(f"❌ NASA Daily API Error Status: {response.status_code}")
                print(f"❌ Error Response: {response.text[:200]}...")
                return None

            response.raise_for_status()
            data = response.json()

            # Debug: see what data we got
            print(f"✅ NASA Daily Data received, type: {type(data)}")
            if data:
                print(f"📊 Data keys: {list(data.keys())}")
                if "properties" in data and "parameter" in data["properties"]:
                    params_available = list(data["properties"]["parameter"].keys())
                    print(f"📈 Parameters available: {params_available}")

            cache_response(cache_key, data)
            print(f"💾 Cached daily data for {cache_key}")
            return data

        except requests.exceptions.Timeout:
            print("⏰ NASA Daily API request timed out after 15 seconds")
            return None
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching daily data from NASA POWER API: {e}")
            return None
        except Exception as e:
            print(f"💥 Unexpected error in NASA daily client: {e}")
            import traceback

            traceback.print_exc()
            return None

    def get_historical_data(self, latitude, longitude, date, years_back=5):
        print(f"📚 Getting historical data for {date}, {years_back} years back")

        historical_data = []
        year = int(date.split("-")[0])

        for i in range(1, years_back + 1):
            historical_year = year - i
            historical_date = date.replace(str(year), str(historical_year))
            print(f"📅 Getting data for historical year: {historical_year}")

            data = self.get_daily_weather_data(latitude, longitude, historical_date, historical_date)

            if data and "properties" in data:
                historical_data.append({"year": historical_year, "data": data})
                print(f"✅ Added historical data for {historical_year}")
            else:
                print(f"❌ No data found for {historical_year}")

        print(f"📦 Total historical data points collected: {len(historical_data)}")
        return historical_data
