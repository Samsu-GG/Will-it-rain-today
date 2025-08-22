import os
import json
import time
from datetime import datetime, timedelta


class HybridCache:
    def __init__(self, cache_dir="cache"):
        self.cache_dir = cache_dir
        self._memory_cache = {}

        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir)

    def _get_cache_path(self, key):
        return os.path.join(self.cache_dir, f"{key}.json")

    def get(self, key):
        # 1. Check memory cache
        if key in self._memory_cache:
            cached_item = self._memory_cache[key]
            if time.time() < cached_item["expires"]:
                return cached_item["data"]
            else:
                del self._memory_cache[key]  # expired in memory

        # 2. Check file cache
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

            # If valid, load into memory too
            data = cache_data["data"]
            expiry_time = time.time() + (expiry_hours * 3600)
            self._memory_cache[key] = {"data": data, "expires": expiry_time}
            return data

        except (FileNotFoundError, json.JSONDecodeError, KeyError):
            return None

    def set(self, key, data, expiry_hours=24):
        expiry_time = time.time() + (expiry_hours * 3600)

        # 1. Save in memory
        self._memory_cache[key] = {"data": data, "expires": expiry_time}

        # 2. Save in file
        cache_path = self._get_cache_path(key)
        try:
            cache_data = {
                "data": data,
                "timestamp": datetime.now().isoformat(),
                "expiry_hours": expiry_hours,
            }
            with open(cache_path, "w") as f:
                json.dump(cache_data, f)
            return True
        except Exception as e:
            print(f"Error writing cache file: {e}")
            return False


# Global cache instance
cache = HybridCache()


def cache_response(key, data, expiry_hours=24):
    return cache.set(key, data, expiry_hours)


def get_cached_response(key):
    return cache.get(key)
