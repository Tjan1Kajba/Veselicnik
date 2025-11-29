from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MusicRequest(BaseModel):
    user_id: str
    song_name: str
    artist: Optional[str] = None
    votes: int = 0
    timestamp: Optional[datetime] = None

class Vote(BaseModel):
    user_id: str 



