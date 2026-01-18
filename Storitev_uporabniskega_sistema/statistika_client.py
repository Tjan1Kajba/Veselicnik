import os
import requests
from correlation import get_correlation_id


def poslji_statistiko(endpoint: str):
    url = os.getenv("STATISTIKA_URL", "http://statistika_service:8000/statistika")
    try:
        headers = {}
        cid = get_correlation_id()
        if cid:
            headers["X-Correlation-ID"] = cid

        response = requests.post(url, json={"klicanaStoritev": endpoint}, headers=headers, timeout=2)
        response.raise_for_status()
    except Exception as e:
        print(f"Napaka pri pošiljanju statistike: {e}")
