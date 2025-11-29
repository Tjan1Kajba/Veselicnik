from fastapi import FastAPI, Request, Depends, HTTPException, status, Cookie, Response
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import redis
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import json
import os


REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
MONGODB_URL = os.getenv(
    'MONGODB_URL', 'mongodb://localhost:27017/uporabniski_sistem')
SERVICE_HOST = os.getenv('SERVICE_HOST', '0.0.0.0')
SERVICE_PORT = int(os.getenv('SERVICE_PORT', 8000))


redis_client = None
mongo_client = None
users_collection = None

try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        decode_responses=True,
        socket_connect_timeout=5,
        retry_on_timeout=True
    )
    redis_client.ping()
    print("Redis connection successfull")
except Exception as e:
    print(f"Redis connection error: {e}")
    redis_client = None

try:
    mongo_client = MongoClient(
        MONGODB_URL,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000
    )
    mongo_client.admin.command('ping')
    db = mongo_client["uporabniski_sistem"]
    users_collection = db["uporabniki"]
    print("MongoDB connection successfull")
except Exception as e:
    print(f"MongoDB connection error: {e}")
    mongo_client = None
    users_collection = None

app = FastAPI(
    title="Uporabniški Sistem",
    description="Storitev za upravljanje uporabnikov in sej",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UstvariUporabnika(BaseModel):
    uporabnisko_ime: str
    email: EmailStr
    geslo: str
    ime: Optional[str] = None
    priimek: Optional[str] = None
    spol: Optional[str] = None


class OdgovorUporabnika(BaseModel):
    id: str
    uporabnisko_ime: str
    email: str
    ime: Optional[str] = None
    priimek: Optional[str] = None
    spol: Optional[str] = None
    tip_uporabnika: str = "normal"
    ustvarjeno: datetime
    posodobljeno: Optional[datetime] = None


class PrijavaUporabnika(BaseModel):
    uporabnisko_ime_ali_email: str
    geslo: str


class PosodobiUporabnika(BaseModel):
    uporabnisko_ime: Optional[str] = None
    email: Optional[EmailStr] = None
    geslo: Optional[str] = None
    ime: Optional[str] = None
    priimek: Optional[str] = None
    spol: Optional[str] = None


class SpremeniGeslo(BaseModel):
    novo_geslo: str
    ponovitev_novega_gesla: str

    @validator('ponovitev_novega_gesla')
    def gesli_se_ujemata(cls, v, values):
        if 'novo_geslo' in values and v != values['novo_geslo']:
            raise ValueError('Gesli se ne ujemata')
        return v

    @validator('novo_geslo')
    def preveri_dolzino_gesla(cls, v):
        if len(v) < 4:
            raise ValueError('Geslo mora biti vsaj 4 znake dolgo')
        return v


pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


# Upravljanje sej
def ustvari_sejo(user_id: str, username: str) -> str:
    if not redis_client:
        raise HTTPException(status_code=503, detail="Storitev sej ni na voljo")

    session_token = secrets.token_urlsafe(32)
    session_data = {
        "user_id": user_id,
        "username": username,
        "created_at": datetime.utcnow().isoformat()
    }

    redis_client.setex(
        f"session:{session_token}",
        timedelta(hours=24),
        json.dumps(session_data)
    )
    return session_token


def pridobi_sejo(session_token: str) -> Optional[dict]:
    if not redis_client or not session_token:
        return None

    session_data = redis_client.get(f"session:{session_token}")
    if session_data:
        return json.loads(session_data)
    return None


def prekini_sejo(session_token: str):
    if redis_client and session_token:
        redis_client.delete(f"session:{session_token}")


def trenutni_uporabnik(session_token: str = Cookie(None)) -> Optional[dict]:
    if not session_token or not mongo_client:
        return None

    session = pridobi_sejo(session_token)
    if not session:
        return None

    user = users_collection.find_one({"_id": ObjectId(session["user_id"])})
    if user:
        user["id"] = str(user["_id"])
        return user
    return None


def zahtevaj_avtentikacijo(current_user: dict = Depends(trenutni_uporabnik)):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Za dostop se morate prijaviti"
        )
    return current_user


def zakodiraj_geslo(geslo: str) -> str:
    return pwd_context.hash(geslo)


def preveri_geslo(geslo: str, zakodirano_geslo: str) -> bool:
    return pwd_context.verify(geslo, zakodirano_geslo)


# Poti
@app.post("/uporabnik/registracija", tags=["Sistem registracije in prijave"], response_model=OdgovorUporabnika)
async def registracija(podatki: UstvariUporabnika):
    """
    Registracija novega uporabnika.
    """
    if not mongo_client:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    if len(podatki.geslo) < 4:
        raise HTTPException(
            status_code=400, detail="Geslo mora biti vsaj 4 znake dolgo")

    if users_collection.find_one({"$or": [
        {"uporabnisko_ime": podatki.uporabnisko_ime},
        {"email": podatki.email}
    ]}):
        raise HTTPException(
            status_code=400, detail="Uporabniško ime ali email že obstaja")

    uporabnik = podatki.model_dump()
    uporabnik["zakodirano_geslo"] = zakodiraj_geslo(podatki.geslo)
    uporabnik["tip_uporabnika"] = "normal"
    uporabnik["ustvarjeno"] = datetime.utcnow()
    uporabnik["posodobljeno"] = None
    del uporabnik["geslo"]

    result = users_collection.insert_one(uporabnik)
    uporabnik["id"] = str(result.inserted_id)

    return OdgovorUporabnika(**uporabnik)


@app.post("/uporabnik/prijava", tags=["Sistem registracije in prijave"])
async def prijava(podatki: PrijavaUporabnika, response: Response):
    """
    Prijava uporabnika z uporabniškim imenom ali emailom in geslom.
    """
    if not mongo_client:
        raise HTTPException(status_code=503, detail="Storitev ni na voljo")

    user = users_collection.find_one({"$or": [
        {"uporabnisko_ime": podatki.uporabnisko_ime_ali_email},
        {"email": podatki.uporabnisko_ime_ali_email}
    ]})

    if not user or not preveri_geslo(podatki.geslo, user["zakodirano_geslo"]):
        raise HTTPException(
            status_code=401, detail="Napačno uporabniško ime/email ali geslo")

    session_token = ustvari_sejo(str(user["_id"]), user["uporabnisko_ime"])

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        max_age=24 * 60 * 60,
        secure=False,
        samesite="lax"
    )

    return {
        "sporocilo": "Prijava uspešna",
        "uporabnik": {
            "id": str(user["_id"]),
            "uporabnisko_ime": user["uporabnisko_ime"],
            "email": user["email"],
            "ime": user.get("ime"),
            "priimek": user.get("priimek"),
            "spol": user.get("spol"),
            "tip_uporabnika": user.get("tip_uporabnika", "normal")
        }
    }


@app.post("/uporabnik/odjava", tags=["Sistem registracije in prijave"])
async def odjava(request: Request, response: Response, current_user: dict = Depends(zahtevaj_avtentikacijo)):
    """
    Odjava trenutnega uporabnika. 
    """
    session_token = request.cookies.get("session_token")

    if session_token:
        prekini_sejo(session_token)

    response.delete_cookie("session_token")
    return {"sporocilo": "Odjava uspešna"}


@app.get("/uporabnik/prijavljen", tags=["Podatki uporabnika"], response_model=OdgovorUporabnika)
async def prijavljen_uporabnik(current_user: dict = Depends(zahtevaj_avtentikacijo)):
    """
    Pridobi podatke o prijavljenem uporabniku.
    """
    return OdgovorUporabnika(**current_user)


@app.get("/uporabniki", tags=["Podatki uporabnika"], response_model=List[OdgovorUporabnika])
async def vsi_uporabniki(current_user: dict = Depends(zahtevaj_avtentikacijo)):
    """
    Pridobi seznam vseh uporabnikov. 
    """
    if not mongo_client:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        users = list(users_collection.find())
        for user in users:
            user["id"] = str(user["_id"])
        return [OdgovorUporabnika(**user) for user in users]
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Napaka pri pridobivanju uporabnikov: {str(e)}")


@app.put("/uporabnik/posodobi-uporabnika", tags=["Posodobi uporabnika"], response_model=OdgovorUporabnika)
async def posodobi_uporabnika(
    podatki: PosodobiUporabnika,
    current_user: dict = Depends(zahtevaj_avtentikacijo)
):
    """
    Posodobi podatke trenutnega uporabnika.
    """
    if not mongo_client:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        update_data = {}
        if podatki.uporabnisko_ime is not None:
            existing_user = users_collection.find_one({
                "uporabnisko_ime": podatki.uporabnisko_ime,
                "_id": {"$ne": ObjectId(current_user["id"])}
            })
            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail="Uporabniško ime že obstaja"
                )
            update_data["uporabnisko_ime"] = podatki.uporabnisko_ime
        if podatki.email is not None:
            existing_user = users_collection.find_one({
                "email": podatki.email,
                "_id": {"$ne": ObjectId(current_user["id"])}
            })
            if existing_user:
                raise HTTPException(
                    status_code=400,
                    detail="Email že obstaja"
                )
            update_data["email"] = podatki.email

        if podatki.ime is not None:
            update_data["ime"] = podatki.ime
        if podatki.priimek is not None:
            update_data["priimek"] = podatki.priimek
        if podatki.spol is not None:
            update_data["spol"] = podatki.spol

        if podatki.geslo is not None:
            if len(podatki.geslo) < 4:
                raise HTTPException(
                    status_code=400,
                    detail="Geslo mora biti vsaj 4 znake dolgo"
                )
            update_data["zakodirano_geslo"] = zakodiraj_geslo(podatki.geslo)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="Ni podatkov za posodobitev"
            )

        update_data["posodobljeno"] = datetime.utcnow()

        result = users_collection.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": update_data}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Napaka pri posodabljanju uporabnika"
            )

        updated_user = users_collection.find_one(
            {"_id": ObjectId(current_user["id"])})
        updated_user["id"] = str(updated_user["_id"])

        return OdgovorUporabnika(**updated_user)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri posodabljanju uporabnika: {str(e)}"
        )


@app.patch("/uporabnik/posodobi-uporabnika/spremeni-geslo", tags=["Posodobi uporabnika"], response_model=dict)
async def spremeni_geslo(
        podatki: SpremeniGeslo,
        current_user: dict = Depends(zahtevaj_avtentikacijo)):
    """
    Spremeni geslo trenutnega uporabnika.
    """
    if not mongo_client:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        novo_zakodirano_geslo = zakodiraj_geslo(podatki.novo_geslo)
        result = users_collection.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": {
                "zakodirano_geslo": novo_zakodirano_geslo,
                "posodobljeno": datetime.utcnow()
            }}
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Napaka pri spreminjanju gesla"
            )

        return {
            "sporocilo": "Geslo uspešno spremenjeno",
            "uporabnik": {
                "id": current_user["id"],
                "uporabnisko_ime": current_user["uporabnisko_ime"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri spreminjanju gesla: {str(e)}"
        )


@app.delete("/uporabnik/izbrisi-racun", tags=["Izbriši uporabnika"], response_model=dict)
async def izbrisi_racun(
    request: Request,
    response: Response,
    current_user: dict = Depends(zahtevaj_avtentikacijo)
):
    """
    Izbriši račun trenutnega uporabnika.
    """
    if not mongo_client:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        user_id = current_user["id"]

        result = users_collection.delete_one({"_id": ObjectId(user_id)})

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Napaka pri brisanju uporabnika"
            )

        session_token = request.cookies.get("session_token")
        if session_token:
            prekini_sejo(session_token)

        response.delete_cookie("session_token")

        return {
            "sporocilo": "Račun uspešno izbrisan",
            "uporabnik": {
                "id": user_id,
                "uporabnisko_ime": current_user["uporabnisko_ime"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri brisanju računa: {str(e)}"
        )


@app.delete("/uporabnik/izbrisi-racun/{uporabnisko_ime}", tags=["Izbriši uporabnika"], response_model=dict)
async def izbrisi_uporabnika_po_uporabniskem_imenu(
    uporabnisko_ime: str,
    current_user: dict = Depends(zahtevaj_avtentikacijo)
):
    """
    Izbriši uporabnika po uporabniškem imenu. 
    """
    if not mongo_client:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:

        user_to_delete = users_collection.find_one(
            {"uporabnisko_ime": uporabnisko_ime})

        if not user_to_delete:
            raise HTTPException(
                status_code=404,
                detail=f"Uporabnik z uporabniškim imenom '{uporabnisko_ime}' ne obstaja"
            )

        user_to_delete_id = str(user_to_delete["_id"])
        current_user_id = current_user["id"]

        result = users_collection.delete_one(
            {"_id": ObjectId(user_to_delete_id)})

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Napaka pri brisanju uporabnika"
            )

        if redis_client:
            session_keys = redis_client.keys("session:*")
            for key in session_keys:
                session_data = redis_client.get(key)
                if session_data:
                    session_info = json.loads(session_data)
                    if session_info.get("user_id") == user_to_delete_id:
                        redis_client.delete(key)

        if user_to_delete_id == current_user_id:
            response = {
                "sporocilo": "Vaš račun je bil uspešno izbrisan",
                "uporabnik": {
                    "id": user_to_delete_id,
                    "uporabnisko_ime": uporabnisko_ime,
                    "email": user_to_delete.get("email")
                },
                "izbrisan_sam": True
            }
        else:
            response = {
                "sporocilo": "Uporabnik uspešno izbrisan",
                "uporabnik": {
                    "id": user_to_delete_id,
                    "uporabnisko_ime": uporabnisko_ime,
                    "email": user_to_delete.get("email")
                },
                "izbrisan_sam": False
            }
        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri brisanju uporabnika: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=SERVICE_HOST,
        port=SERVICE_PORT,
        reload=False
    )
