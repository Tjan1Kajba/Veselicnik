from fastapi import FastAPI, HTTPException
from bson import ObjectId
from models import MusicRequest, Vote
from database import requests_collection
from datetime import datetime
import requests
from fastapi import HTTPException, Request

app = FastAPI(title="Music Requests Service")




def request_serializer(request) -> dict:
    return {
        "id": str(request["_id"]),
        "user_id": request["user_id"],
        "song_name": request["song_name"],
        "artist": request.get("artist"),
        "votes": request.get("votes", 0),
        "timestamp": request.get("timestamp"),
        "id_veselica": request.get("id_veselica")
    }


FOOD_SERVICE_URL = "http://host.docker.internal:8001"
USER_SERVICE_URL = "http://host.docker.internal:8002"

def get_logged_in_user(session_token: str):
    cookies = {"session_token": session_token}
    r = requests.get(f"{USER_SERVICE_URL}/uporabnik/prijavljen", cookies=cookies)
    if r.status_code == 200:
        return r.json()  # vrne JSON z 'user'
    return None

@app.get("/music/requests/veselica/{id_veselica}")
def get_requests_by_veselica(id_veselica: str):
    requests_list = list(requests_collection.find({"id_veselica": id_veselica}))
    if not requests_list:
        raise HTTPException(status_code=404, detail="No music requests found for this veselica")

    return [request_serializer(r) for r in requests_list]

@app.post("/music/requests")
def create_request(music_request: MusicRequest, request: Request):
    session_token = request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    auth_response = get_logged_in_user(session_token)
    if not auth_response:
        raise HTTPException(status_code=401, detail="Invalid session")

    user = auth_response.get("user")  # ⬅️ popravljeno: pridobi user iz odgovora
    if not user:
        raise HTTPException(status_code=401, detail="Invalid user data")

    user_id = user["uporabnisko_ime"]
    id_veselica = user.get("id_veselica")  # pridobi veselico, če obstaja

    # 3️⃣ Preveri, če je uporabnik kupil hrano
    r = requests.get(f"{FOOD_SERVICE_URL}/orders/user/{user_id}/paid")
    if r.status_code != 200 or not r.json().get("has_paid_orders", False):
        raise HTTPException(status_code=403, detail="You must buy food before making a music request")

    request_doc = music_request.dict()
    request_doc["votes"] = 0
    request_doc["timestamp"] = datetime.utcnow()
    request_doc["user_id"] = user_id
    request_doc["id_veselica"] = id_veselica

    result = requests_collection.insert_one(request_doc)
    return {"id": str(result.inserted_id), "user_id": user_id, "id_veselica": id_veselica}



@app.post("/music/requests/{id}/vote")
def vote_request(id: str, vote: Vote):
    result = requests_collection.update_one(
        {"_id": ObjectId(id)},
        {"$inc": {"votes": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Music request not found")
    return {"message": "Vote recorded"}


@app.get("/music/requests")
def get_all_requests():
    requests = list(requests_collection.find())
    return [request_serializer(r) for r in requests]

@app.get("/music/requests/top")
def get_top_requests(limit: int = 10):
    requests = list(requests_collection.find().sort("votes", -1).limit(limit))
    return [request_serializer(r) for r in requests]


@app.put("/music/requests/{id}")
def update_request(id: str, request: MusicRequest):
    update_data = request.dict(exclude_unset=True)
    result = requests_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Music request not found")
    return {"message": "Music request updated"}

@app.put("/music/requests/{id}/reset_votes")
def reset_votes(id: str):
    result = requests_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"votes": 0}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Music request not found")
    return {"message": "Votes reset"}


@app.delete("/music/requests/{id}")
def delete_request(id: str):
    result = requests_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Music request not found")
    return {"message": "Music request deleted"}

@app.delete("/music/requests")
def delete_all_requests():
    result = requests_collection.delete_many({})
    return {"message": f"Deleted {result.deleted_count} requests"}
