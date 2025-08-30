import json
import os


class WeatherConditionClassifier:
    def __init__(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        thresholds_path = os.path.join(current_dir, "..", "config", "thresholds.json")

        with open(thresholds_path, "r") as f:
            self.thresholds = json.load(f)

    def get_condition(self, temperature, precipitation, wind_speed, humidity):
        t = self.thresholds

        # --- Rain & Storm ---
        if precipitation >= t["precipitation"]["heavy"]:
            if wind_speed >= t["wind"]["strong"]:
                return "Stormy"
            return "Heavy Rain"
        elif precipitation >= t["precipitation"]["moderate"]:
            return "Rainy"
        elif precipitation >= t["precipitation"]["light"]:
            return "Light Rain"

        # --- Snow / Cold ---
        if temperature <= t["temperature"]["extreme_cold"]:
            return "Freezing / Snowy"
        elif temperature <= t["temperature"]["cold"]:
            return "Cold & Cloudy" if humidity >= t["humidity"]["high"] else "Cold & Clear"

        # --- Heat / Sun ---
        if temperature >= t["temperature"]["extreme_heat"]:
            return "Very Hot / Heatwave"
        elif temperature >= t["temperature"]["heat"]:
            return "Hot & Sunny" if humidity <= t["humidity"]["low"] else "Hot & Humid"

        # --- Humidity & Clouds ---
        if humidity >= t["humidity"]["high"]:
            return "Cloudy / Humid"
        elif humidity <= t["humidity"]["very_low"]:
            return "Dry & Clear"

        # --- Default Comfortable Weather ---
        return "Clear / Pleasant"
