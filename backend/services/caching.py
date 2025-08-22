import json
import os
from datetime import datetime, timedelta


class SimpleCache:
    def __init__(self, cache_dir="cache"):
        self.cache_dir = cache_dir

        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir)

    def _get_cache_path(self, key):
        return os.path.join(self.cache_dir, f"{key}.json")

    def get(self, key):
        cache_path = self._get_cache_path(key)

        if not os.path.exists(cache_path):
            return None

        try:
            with open(cache_path, "r") as f:
                cache_data = json.load(f)

            mod_time = datetime.fromisoformat(cache_data["timestamp"])
            expiry_hours = cache_data.get("expiry_hours", 24)

            if datetime.now() - mod_time > timedelta(hours=expiry_hours):
                os.remove(cache_path)
                return None

            return cache_data["data"]
        except (FileNotFoundError, json.JSONDecodeError, KeyError):
            return None

    def set(self, key, data, expiry_hours=24):
        cache_path = self._get_cache_path(key)

        try:
            cache_data = {"data": data, "timestamp": datetime.now().isoformat(), "expiry_hours": expiry_hours}

            with open(cache_path, "w") as f:
                json.dump(cache_data, f)
            return True
        except (FileNotFoundError, json.JSONDecodeError, KeyError):
            return False


cache = SimpleCache()


def cache_response(key, data, expiry_hours=24):
    return cache.set(key, data, expiry_hours)


def get_cached_response(key):
    return cache.get(key)
