from flask import Flask, request, jsonify
import pytz
from flask_cors import CORS
from services.nasaPower import NasaPowerClient
from flask import send_from_directory
from services.locationService import get_coordinates
from services.forecastService import ForecastClient
from services.riskCalculator import RiskCalculator
import datetime
import os
from services.weatherCondition import WeatherConditionClassifier
from services.autocomplete_name import get_area_suggestions


condition_classifier = WeatherConditionClassifier()
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

nasa_client = NasaPowerClient()
forecast_client = ForecastClient()
risk_calculator = RiskCalculator()


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "Backend is running"})


@app.route("/api/weather/hourly", methods=["GET"])
def get_hourly_weather():
    latitude = request.args.get("lat")
    longitude = request.args.get("lon")
    date_str = request.args.get("date")

    if not all([latitude, longitude, date_str]):
        return jsonify({"error": "Missing parameters: lat, lon, and date are required"}), 400

    try:
        utc = pytz.UTC
        current_time = datetime.datetime.now(utc)
        target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=utc)
        is_today = target_date.date() == current_time.date()
        is_future = target_date.date() > current_time.date()

        # DEBUG PRINT
        print(f"🔍 Request: lat={latitude}, lon={longitude}, date={date_str}")
        print(f"📅 Target date: {target_date}, NASA format: {target_date.strftime('%Y%m%d')}")
        print(f"⏰ Current time: {current_time}, Is today: {is_today}, Is future: {is_future}")

        if is_future:
            hourly_data = get_future_data(latitude, longitude, target_date)
        else:
            hourly_data = get_historical_data(latitude, longitude, target_date, current_time, is_today)

        # DEBUG PRINT
        print(f"📊 Hourly data points found: {len(hourly_data)}")

        hourly_data.sort(key=lambda x: x["time"])

        response = {
            "date": date_str,
            "location": {"latitude": latitude, "longitude": longitude},
            "hourly_data": hourly_data,
            "is_today": is_today,
            "is_future": is_future,
        }

        return jsonify(response)

    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    except Exception as e:
        print(f"💥 Unexpected error in get_hourly_weather: {e}")
        import traceback

        traceback.print_exc()
        return jsonify({"error": f"Server error: {str(e)}"}), 500


def get_future_data(latitude, longitude, target_date):
    print(f"🌤️ Getting future data for {target_date}")
    hourly_data = []
    end_date = target_date + datetime.timedelta(days=1)

    forecast_data = forecast_client.get_hourly_forecast(
        latitude, longitude, target_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")
    )

    if forecast_data and "hourly" in forecast_data:
        time_list = forecast_data["hourly"]["time"]
        temp_list = forecast_data["hourly"]["temperature_2m"]
        precip_list = forecast_data["hourly"]["precipitation"]
        wind_list = forecast_data["hourly"]["windspeed_10m"]
        humidity_list = forecast_data["hourly"]["relative_humidity_2m"]

        print(f"📡 Forecast data points: {len(time_list)}")

        for i in range(len(time_list)):
            time_obj = datetime.datetime.fromisoformat(time_list[i])
            if time_obj.date() == target_date.date():
                risk_assessment = risk_calculator.calculate_hourly_risk(
                    temp_list[i], precip_list[i], wind_list[i], humidity_list[i]
                )

                # Get weather condition
                condition = condition_classifier.get_condition(
                    temp_list[i], precip_list[i], wind_list[i], humidity_list[i]
                )

                hourly_data.append(
                    {
                        "time": time_list[i],
                        "temperature": temp_list[i],
                        "precipitation": precip_list[i],
                        "wind_speed": wind_list[i],
                        "humidity": humidity_list[i],
                        "risk_assessment": risk_assessment,
                        "condition": condition,
                        "source": "forecast",
                    }
                )

    print(f"✅ Future data points processed: {len(hourly_data)}")
    return hourly_data



def get_historical_data(latitude, longitude, target_date, current_time, is_today):
    print(f"📚 Getting historical data: lat={latitude}, lon={longitude}, date={target_date}, is_today={is_today}")
    hourly_data = []
    target_date_str = target_date.strftime("%Y%m%d")

    nasa_data = nasa_client.get_hourly_weather_data(latitude, longitude, target_date_str, target_date_str)

    if nasa_data and "properties" in nasa_data:
        properties = nasa_data["properties"]["parameter"]

        for hour in range(24):
            time_key = f"{target_date_str}{hour:02d}"

            if ("T2M" in properties and time_key in properties["T2M"] and (hour <= current_time.hour or not is_today)):
                temperature = properties["T2M"][time_key]
                precipitation = properties["PRECTOTCORR"].get(time_key, 0) if "PRECTOTCORR" in properties else 0
                wind_speed = properties["WS2M"].get(time_key, 0) if "WS2M" in properties else 0
                humidity = properties["RH2M"].get(time_key) if "RH2M" in properties else None

                risk_assessment = risk_calculator.calculate_hourly_risk(
                    temperature, precipitation, wind_speed, humidity
                )

                # Get weather condition
                condition = condition_classifier.get_condition(
                    temperature, precipitation, wind_speed, humidity
                )

                hourly_data.append(
                    {
                        "time": f"{target_date_str[:4]}-{target_date_str[4:6]}-{target_date_str[6:8]}T{hour:02d}:00:00",
                        "temperature": temperature,
                        "precipitation": precipitation,
                        "wind_speed": wind_speed,
                        "humidity": humidity,
                        "risk_assessment": risk_assessment,
                        "condition": condition,
                        "source": "nasa",
                    }
                )
                print(f"✅ Added data for hour {hour} with key: {time_key}, temp: {temperature}°C")
            else:
                print(f"❌ No data found for hour {hour} with key: {time_key}")

    # For today, get forecast for remaining hours
    if is_today and current_time.hour < 23:
        print("🌤️ Getting forecast for remaining hours of today")
        forecast_data = forecast_client.get_hourly_forecast(
            latitude, longitude, current_time.strftime("%Y-%m-%d"), current_time.strftime("%Y-%m-%d")
        )

        if forecast_data and "hourly" in forecast_data:
            time_list = forecast_data["hourly"]["time"]
            temp_list = forecast_data["hourly"]["temperature_2m"]
            precip_list = forecast_data["hourly"]["precipitation"]
            wind_list = forecast_data["hourly"]["windspeed_10m"]
            humidity_list = forecast_data["hourly"]["relative_humidity_2m"]

            for i in range(len(time_list)):
                time_obj = datetime.datetime.fromisoformat(time_list[i])
                if time_obj.date() == current_time.date() and time_obj.hour > current_time.hour:
                    risk_assessment = risk_calculator.calculate_hourly_risk(
                        temp_list[i], precip_list[i], wind_list[i], humidity_list[i]
                    )

                    # Get weather condition
                    condition = condition_classifier.get_condition(
                        temp_list[i], precip_list[i], wind_list[i], humidity_list[i]
                    )

                    hourly_data.append(
                        {
                            "time": time_list[i],
                            "temperature": temp_list[i],
                            "precipitation": precip_list[i],
                            "wind_speed": wind_list[i],
                            "humidity": humidity_list[i],
                            "risk_assessment": risk_assessment,
                            "condition": condition,
                            "source": "forecast",
                        }
                    )

    print(f"📦 Total hourly data points processed: {len(hourly_data)}")
    return hourly_data
@app.route("/api/location/suggest", methods=["GET"]) # for get area suggestion...
def location_suggest():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Query parameter q is required"}), 400
    
    suggestions = get_area_suggestions(query)
    return jsonify(suggestions)


@app.route('/')
def serve_frontend():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)
@app.route("/api/location/coordinates", methods=["POST"])
def get_location_coordinates():
    data = request.get_json()
    place_name = data.get('place_name')
    
    if not place_name:
        return jsonify({"error": "place_name is required"}), 400
    
    coordinates = get_coordinates(place_name)
    if coordinates:
        return jsonify(coordinates)
    else:
        return jsonify({"error": "Location not found"}), 404
    


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
 