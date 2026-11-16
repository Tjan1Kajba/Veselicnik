from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class CreateMusicRequest(BaseModel):
    # Ime pesmi: 1-100 znakov, samo presledki niso veljavni. Izvajalec (neobvezen): največ 100 znakov.
    song_name: str = Field(..., min_length=1, max_length=100)
    artist: Optional[str] = Field(None, max_length=100)
    id_veselica: str

    @field_validator("song_name", "artist", mode="before")
    @classmethod
    def odstrani_presledke(cls, v):
        return v.strip() if isinstance(v, str) else v

class MusicRequest(BaseModel):
    user_id: str
    song_name: str
    artist: Optional[str] = None
    votes: int = 0
    timestamp: Optional[datetime] = None
    id_veselica: Optional[str] = None

class Vote(BaseModel):
    pass  # User ID comes from JWT token
