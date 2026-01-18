import os
import requests

def poslji_statistiko(endpoint: str):
    url = os.getenv("STATISTIKA_URL", "http://statistika_service:8000/statistika")
    try:
        response = requests.post(url, json={"klicanaStoritev": endpoint}, timeout=2)
        response.raise_for_status()
    except Exception as e:
        print(f"Napaka pri pošiljanju statistike: {e}")
