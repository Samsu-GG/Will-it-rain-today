import requests

def get_coordinates(place_name: str):
    """
    Convert a place name into latitude & longitude using OpenStreetMap Nominatim API.
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": place_name,
        "format": "json",
        "limit": 1
    }

    try:
        response = requests.get(url, params=params, headers={"User-Agent": "WeatherRiskApp/1.0"})
        response.raise_for_status()
        data = response.json()

        if len(data) == 0:
            return None  # no result found

        lat = float(data[0]["lat"])
        lon = float(data[0]["lon"])
        return {"lat": lat, "lon": lon}

    except Exception as e:
        print(f"Error fetching coordinates: {e}")
        return None