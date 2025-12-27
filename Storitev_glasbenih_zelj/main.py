from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from datetime import datetime
import requests
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import os
from models import MusicRequest, Vote, CreateMusicRequest
from database import requests_collection

app = FastAPI(title="Music Requests Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FOOD_SERVICE_URL = "http://host.docker.internal:8001"
USER_SERVICE_URL = "http://host.docker.internal:8002"

JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"


def preveri_jwt_token(token: str):
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            audience="api-clients",
            issuer="uporabniski-sistem"
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token je potekel")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Neveljaven token")

bearer_scheme = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    token = credentials.credentials
    return preveri_jwt_token(token)


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


@app.get("/music/requests/veselica/{id_veselica}")
def get_requests_by_veselica(id_veselica: str):
    requests_list = list(requests_collection.find({"id_veselica": id_veselica}))
    return [request_serializer(r) for r in requests_list]

@app.post("/music/requests")
def create_request(music_request: CreateMusicRequest, user_data: dict = Depends(get_current_user)):
    user_id = user_data["username"]

    # Check if user has paid orders (temporarily disabled for testing)
    # r = requests.get(f"{FOOD_SERVICE_URL}/orders/user/{user_id}/paid")
    # if r.status_code != 200 or not r.json().get("has_paid_orders", False):
    #     raise HTTPException(status_code=403, detail="You must buy food before making a music request")

    request_doc = music_request.dict()
    request_doc["votes"] = 0
    request_doc["timestamp"] = datetime.utcnow()
    request_doc["user_id"] = user_id

    result = requests_collection.insert_one(request_doc)
    return {"id": str(result.inserted_id), "user_id": user_id, "id_veselica": music_request.id_veselica}

@app.post("/music/requests/{id}/vote")
def vote_request(id: str, user_data: dict = Depends(get_current_user)):
    result = requests_collection.update_one({"_id": ObjectId(id)}, {"$inc": {"votes": 1}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Music request not found")
    return {"message": "Vote recorded"}

@app.get("/music/requests")
def get_all_requests():
    requests_list = list(requests_collection.find())
    return [request_serializer(r) for r in requests_list]

@app.get("/music/requests/top")
def get_top_requests(limit: int = 10):
    requests_list = list(requests_collection.find().sort("votes", -1).limit(limit))
    return [request_serializer(r) for r in requests_list]

@app.put("/music/requests/{id}")
def update_request(id: str, request: MusicRequest, user_data: dict = Depends(get_current_user)):
    update_data = request.dict(exclude_unset=True)
    result = requests_collection.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Music request not found")
    return {"message": "Music request updated"}

@app.put("/music/requests/{id}/reset_votes")
def reset_votes(id: str, user_data: dict = Depends(get_current_user)):
    result = requests_collection.update_one({"_id": ObjectId(id)}, {"$set": {"votes": 0}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Music request not found")
    return {"message": "Votes reset"}

@app.delete("/music/requests/{id}")
def delete_request(id: str, user_data: dict = Depends(get_current_user)):
    result = requests_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Music request not found")
    return {"message": "Music request deleted"}

@app.delete("/music/requests")
def delete_all_requests(user_data: dict = Depends(get_current_user)):
    result = requests_collection.delete_many({})
    return {"message": f"Deleted {result.deleted_count} requests"}
