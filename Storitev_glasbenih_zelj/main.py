from fastapi import FastAPI, HTTPException, Depends, Request
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
from logger import send_log
import uuid

app = FastAPI(title="Music Requests Service")

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    correlation_id = (
        request.headers.get("X-Correlation-ID")
        or request.headers.get("x-correlation-id")
        or request.headers.get("X-Correlation-Id")
        or str(uuid.uuid4())
    )
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
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
def create_request(music_request: CreateMusicRequest,request: Request, user_data: dict = Depends(get_current_user)):
    user_id = user_data["username"]
    correlation_id = request.state.correlation_id
    send_log(
        log_type="INFO",
        url="/music/requests",
        message=f"User {user_id} created music request",
        service="music-service",
        correlation_id=correlation_id
    )

    request_doc = music_request.dict()
    request_doc["votes"] = 0
    request_doc["voters"] = []  
    request_doc["timestamp"] = datetime.utcnow()
    request_doc["user_id"] = user_id

    result = requests_collection.insert_one(request_doc)
    return {"id": str(result.inserted_id), "user_id": user_id, "id_veselica": music_request.id_veselica}

@app.post("/music/requests/{id}/vote")
def vote_request(id: str,request: Request, user_data: dict = Depends(get_current_user)):
    user_id = user_data["username"]  
    correlation_id = request.state.correlation_id
    send_log(
        log_type="INFO",
        url="/music/requests{id}/vote",
        message=f"User {user_id} created music vote",
        service="music-service",
        correlation_id=correlation_id
    )
    music_request = requests_collection.find_one({"_id": ObjectId(id)})
    if not music_request:
        raise HTTPException(status_code=404, detail="Music request not found")

    voters = music_request.get("voters", [])

    if user_id in voters:
        raise HTTPException(status_code=400, detail="You have already voted for this song")

    requests_collection.update_one(
        {"_id": ObjectId(id)},
        {"$inc": {"votes": 1}, "$push": {"voters": user_id}}
    )

    return {"message": "Vote recorded"}


@app.get("/music/requests")
def get_all_requests(request: Request):
    correlation_id = request.state.correlation_id
    send_log(
        log_type="INFO",
        url="/music/requests",
        message=f"Created music request",
        service="music-service",
        correlation_id=correlation_id
    )
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
