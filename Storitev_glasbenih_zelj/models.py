from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CreateMusicRequest(BaseModel):
    song_name: str
    artist: Optional[str] = None
    id_veselica: str

class MusicRequest(BaseModel):
    user_id: str
    song_name: str
    artist: Optional[str] = None
    votes: int = 0
    timestamp: Optional[datetime] = None
    id_veselica: Optional[str] = None

class Vote(BaseModel):
    pass  # User ID comes from JWT token
