import json
import os


class RiskCalculator:
    def __init__(self):
        current_dir = os.path.dirname(os.path.abspath(__file__))
        thresholds_path = os.path.join(current_dir, "..", "config", "thresholds.json")

        with open(thresholds_path, "r") as f:
            self.thresholds = json.load(f)

    def calculate_temperature_risk(self, temperature):
        thresholds = self.thresholds["temperature"]

        if temperature >= thresholds["extreme_heat"]:
            return "high", "Extreme heat risk"
        elif temperature >= thresholds["heat"]:
            return "medium", "Heat risk"
        elif temperature <= thresholds["extreme_cold"]:
            return "high", "Extreme cold risk"
        elif temperature <= thresholds["cold"]:
            return "medium", "Cold risk"
        else:
            return "low", "Comfortable temperature"

    def calculate_precipitation_risk(self, precipitation):
        thresholds = self.thresholds["precipitation"]

        if precipitation >= thresholds["heavy"]:
            return "high", "Heavy precipitation"
        elif precipitation >= thresholds["moderate"]:
            return "medium", "Moderate precipitation"
        else:
            return "low", "Light or no precipitation"

    def calculate_wind_risk(self, wind_speed):
        thresholds = self.thresholds["wind"]

        if wind_speed >= thresholds["strong"]:
            return "high", "Strong winds"
        elif wind_speed >= thresholds["moderate"]:
            return "medium", "Moderate winds"
        else:
            return "low", "Calm conditions"

    def calculate_humidity_risk(self, humidity):
        thresholds = self.thresholds["humidity"]

        if humidity >= thresholds["very_high"]:
            return "high", "Very humid conditions"
        elif humidity >= thresholds["high"]:
            return "medium", "Humid conditions"
        elif humidity <= thresholds["very_low"]:
            return "medium", "Very dry conditions"
        else:
            return "low", "Comfortable humidity"

    def calculate_hourly_risk(self, temperature, precipitation, wind_speed, humidity=None):
        temp_risk, temp_msg = self.calculate_temperature_risk(temperature)
        precip_risk, precip_msg = self.calculate_precipitation_risk(precipitation)
        wind_risk, wind_msg = self.calculate_wind_risk(wind_speed)

        risk_levels = {"low": 0, "medium": 1, "high": 2}
        overall_risk = max([temp_risk, precip_risk, wind_risk], key=lambda x: risk_levels[x])

        messages = [temp_msg, precip_msg, wind_msg]
        non_low_messages = [
            msg for msg in messages if not msg.endswith("conditions") and not msg.endswith("precipitation")
        ]

        if non_low_messages:
            summary = "; ".join(non_low_messages)
        else:
            summary = "Ideal weather conditions"

        result = {
            "overall_risk": overall_risk,
            "summary": summary,
            "details": {
                "temperature": {"risk": temp_risk, "message": temp_msg, "value": temperature},
                "precipitation": {"risk": precip_risk, "message": precip_msg, "value": precipitation},
                "wind": {"risk": wind_risk, "message": wind_msg, "value": wind_speed},
            },
        }

        if humidity is not None:
            humidity_risk, humidity_msg = self.calculate_humidity_risk(humidity)
            result["details"]["humidity"] = {"risk": humidity_risk, "message": humidity_msg, "value": humidity}

            if risk_levels[humidity_risk] > risk_levels[overall_risk]:
                result["overall_risk"] = humidity_risk
                result["summary"] += f"; {humidity_msg}"

        return result
