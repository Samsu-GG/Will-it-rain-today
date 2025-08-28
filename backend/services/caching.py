import os # to read join file
import json  # (to create folder or to delete folder)
import time
from datetime import datetime, timedelta # (to work with time and date... datetime-> present time....timedelta-> time addition or subtraction  )

# we are using cache to dont call api many times ...
class HybridCache:
    def __init__(self, cache_dir="cache"):
        self.cache_dir = cache_dir # The cache folder path is stored as a class variable.
        self._memory_cache = {}


        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir)  # if the folder is not existed then it will create folder

    def _get_cache_path(self, key):
        return os.path.join(self.cache_dir, f"{key}.json") # private method...create the full path for the key


    def get(self, key):  #To retrieve data from the cache.
        # 1. Check memory cache
        if key in self._memory_cache:
            cached_item = self._memory_cache[key]
            if time.time() < cached_item["expires"]:
                return cached_item["data"]
            else:
                del self._memory_cache[key]  # expired in memory

        # 2. Check file cache
        cache_path = self._get_cache_path(key)  #Retrieving the file path with _get_cache_path.
        if not os.path.exists(cache_path): # if there is no file then return none

            return None

        try:
            with open(cache_path, "r") as f: # open file "r" means read mode..
                cache_data = json.load(f)  # convert the JSON file to python dictionary

            mod_time = datetime.fromisoformat(cache_data["timestamp"]) # create and update cache time
            expiry_hours = cache_data.get("expiry_hours", 24) # cache will expire after 24 hours(default)

            if datetime.now() - mod_time > timedelta(hours=expiry_hours): # current time > expiry time then cache file will be deleted 
                os.remove(cache_path)
                return None


            # If valid, load into memory too
            data = cache_data["data"] # if cache is valid then stored data will be returned otherwise it will return null
            expiry_time = time.time() + (expiry_hours * 3600)
            self._memory_cache[key] = {"data": data, "expires": expiry_time}
            return data


        except (FileNotFoundError, json.JSONDecodeError, KeyError):
            return None 


    def set(self, key, data, expiry_hours=24): #to save new cache
        expiry_time = time.time() + (expiry_hours * 3600)

        # 1. Save in memory
        self._memory_cache[key] = {"data": data, "expires": expiry_time}

        # 2. Save in file
        cache_path = self._get_cache_path(key) # to find the cache path
        try:
            cache_data = {
                "data": data,
                "timestamp": datetime.now().isoformat(),
                "expiry_hours": expiry_hours,
            }
            with open(cache_path, "w") as f: # open cache file and "w" means write mood
                json.dump(cache_data, f) # write puthon dict to JSON file


            return True
        except Exception as e:
            print(f"Error writing cache file: {e}")
            return False



# Global cache instance
cache = HybridCache() # here cache is a instance of SimpleCache(). we can call the packege function with it.



def cache_response(key, data, expiry_hours=24): # helper function to call set...
    return cache.set(key, data, expiry_hours)


def get_cached_response(key):
    return cache.get(key)
