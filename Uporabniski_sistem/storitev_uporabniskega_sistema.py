from fastapi import FastAPI, Request, Depends, HTTPException, status, Cookie, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
import redis
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import secrets
import json
import os
import jwt
from jwt import PyJWTError

# JWT konfiguracija
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', 30))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', 7))

security = HTTPBearer(auto_error=False)

REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://localhost:27017/uporabniski_sistem')
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
    print("Redis connection successful")
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
    print("MongoDB connection successful")
except Exception as e:
    print(f"MongoDB connection error: {e}")
    mongo_client = None
    users_collection = None

app = FastAPI(
    title="Uporabniški Sistem",
    description="Storitev za upravljanje uporabnikov in sej z JWT avtentikacijo",
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


class JWTResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]


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


class RefreshTokenRequest(BaseModel):
    refresh_token: str


pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def ustvari_jwt_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Ustvari JWT token z zahtevanimi atributi.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "sub": data.get("sub", ""),  # Uporabniški ID
        "name": data.get("name", ""),  # Ime uporabnika
    })

    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY,
                             algorithm=JWT_ALGORITHM)
    return encoded_jwt


def ustvari_access_token(user_data: Dict[str, Any]) -> str:
    """
    Ustvari access token za uporabnika.
    """
    token_data = {
        "sub": str(user_data["_id"]),
        "name": f"{user_data.get('ime', '')} {user_data.get('priimek', '')}".strip() or user_data["uporabnisko_ime"],
        "username": user_data["uporabnisko_ime"],
        "email": user_data["email"],
        "user_type": user_data.get("tip_uporabnika", "normal")
    }

    access_token_expires = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    return ustvari_jwt_token(token_data, access_token_expires)


def ustvari_refresh_token(user_id: str) -> str:
    """
    Ustvari refresh token za uporabnika.
    """
    token_data = {
        "sub": user_id,
        "type": "refresh"
    }

    refresh_token_expires = timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    return ustvari_jwt_token(token_data, refresh_token_expires)


def preveri_jwt_token(token: str) -> Dict[str, Any]:
    """
    Preveri veljavnost JWT tokena in vrne podatke.
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token je potekel",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Neveljaven token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def pridobi_token_iz_zaglavja(credentials: HTTPAuthorizationCredentials) -> Optional[str]:
    """
    Pridobi JWT token iz Authorization zaglavja.
    """
    if credentials:
        if credentials.scheme.lower() == "bearer":
            return credentials.credentials
    return None


async def get_current_user(
    token: str = Depends(security),
    session_token: str = Cookie(None)
) -> Dict[str, Any]:
    """
    Pridobi trenutnega uporabnika iz JWT tokena ali seje.
    """
    if token:
        jwt_token = pridobi_token_iz_zaglavja(token)
        if jwt_token:
            try:
                payload = preveri_jwt_token(jwt_token)
                user_id = payload.get("sub")
                if user_id:
                    if not mongo_client:
                        raise HTTPException(
                            status_code=503, detail="Baza ni na voljo")

                    user = users_collection.find_one(
                        {"_id": ObjectId(user_id)})
                    if user:
                        user["id"] = str(user["_id"])
                        return user

            except HTTPException:
                pass  # Nadaljujemo s preverjanjem seje

    # Če JWT ni veljaven ali ni podan, preverimo sejo
    if session_token and mongo_client:
        session = pridobi_sejo(session_token)
        if session:
            user = users_collection.find_one(
                {"_id": ObjectId(session["user_id"])})
            if user:
                user["id"] = str(user["_id"])
                return user

    return None


def zahtevaj_avtentikacijo(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Zahteva avtentikacijo uporabnika.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Za dostop se morate prijaviti",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


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


def zakodiraj_geslo(geslo: str) -> str:
    return pwd_context.hash(geslo)


def preveri_geslo(geslo: str, zakodirano_geslo: str) -> bool:
    return pwd_context.verify(geslo, zakodirano_geslo)


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


@app.post("/uporabnik/prijava", tags=["Sistem registracije in prijave"], response_model=JWTResponse)
async def prijava(podatki: PrijavaUporabnika, response: Response):
    """
    Prijava uporabnika z uporabniškim imenom ali emailom in geslom.
    Vrne JWT access in refresh token.
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

    access_token = ustvari_access_token(user)
    refresh_token = ustvari_refresh_token(str(user["_id"]))

    # Shrani refresh token v Redis
    if redis_client:
        redis_client.setex(
            f"refresh_token:{str(user['_id'])}",
            timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS),
            refresh_token
        )

    session_token = ustvari_sejo(str(user["_id"]), user["uporabnisko_ime"])

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        max_age=24 * 60 * 60,
        secure=False,
        samesite="lax"
    )

    return JWTResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": str(user["_id"]),
            "uporabnisko_ime": user["uporabnisko_ime"],
            "email": user["email"],
            "ime": user.get("ime"),
            "priimek": user.get("priimek"),
            "spol": user.get("spol"),
            "tip_uporabnika": user.get("tip_uporabnika", "normal")
        }
    )


@app.post("/auth/refresh", tags=["Sistem registracije in prijave"], response_model=JWTResponse)
async def osvezi_token(podatki: RefreshTokenRequest):
    """
    Osveži access token z uporabo refresh tokena.
    """
    try:
        payload = preveri_jwt_token(podatki.refresh_token)

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Neveljaven tip tokena"
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Neveljaven token"
            )

        if redis_client:
            stored_token = redis_client.get(f"refresh_token:{user_id}")
            if stored_token != podatki.refresh_token:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token je preklican"
                )

        if not mongo_client:
            raise HTTPException(status_code=503, detail="Baza ni na voljo")

        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Uporabnik ne obstaja"
            )

        access_token = ustvari_access_token(user)

        return JWTResponse(
            access_token=access_token,
            refresh_token=podatki.refresh_token,  
            expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "id": str(user["_id"]),
                "uporabnisko_ime": user["uporabnisko_ime"],
                "email": user["email"],
                "ime": user.get("ime"),
                "priimek": user.get("priimek"),
                "spol": user.get("spol"),
                "tip_uporabnika": user.get("tip_uporabnika", "normal")
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Napaka pri osveževanju tokena: {str(e)}"
        )


@app.post("/uporabnik/odjava", tags=["Sistem registracije in prijave"])
async def odjava(request: Request, response: Response, current_user: dict = Depends(zahtevaj_avtentikacijo)):
    """
    Odjava trenutnega uporabnika. Prekliče JWT refresh token in sejo.
    """
    session_token = request.cookies.get("session_token")

    if session_token:
        prekini_sejo(session_token)

    if redis_client and current_user:
        redis_client.delete(f"refresh_token:{current_user['id']}")

    response.delete_cookie("session_token")
    return {"sporocilo": "Odjava uspešna"}


@app.get("/uporabnik/prijavljen", tags=["Podatki uporabnika"], response_model=OdgovorUporabnika)
async def prijavljen_uporabnik(current_user: dict = Depends(zahtevaj_avtentikacijo)):
    """
    Pridobi podatke o prijavljenem uporabniku.
    """
    return OdgovorUporabnika(**current_user)


@app.middleware("http")
async def preveri_jwt_middleware(request: Request, call_next):
    """
    Middleware za avtomatično preverjanje JWT tokenov v zahtevkih.
    """
    # Če je zahtevek za javno dostopno pot, preskoči preverjanje
    public_paths = ["/docs", "/redoc", "/openapi.json", "/uporabnik/prijava",
                    "/uporabnik/registracija", "/auth/refresh"]

    if request.url.path in public_paths or request.url.path.startswith("/static"):
        return await call_next(request)

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.replace("Bearer ", "")
            payload = preveri_jwt_token(token)
            request.state.user_id = payload.get("sub")
            request.state.user_data = payload
        except HTTPException as e:
            return Response(
                content=json.dumps({"detail": e.detail}),
                status_code=e.status_code,
                media_type="application/json"
            )
        except Exception:
            pass 

    return await call_next(request)



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

        if redis_client:
            redis_client.delete(f"refresh_token:{user_id}")

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

            redis_client.delete(f"refresh_token:{user_to_delete_id}")

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


@app.post("/auth/verify", tags=["JWT Avtentikacija"])
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Preveri veljavnost JWT tokena.
    Uporabljajo druge storitve za verifikacijo tokenov.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Manjka avtorizacijski token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = pridobi_token_iz_zaglavja(credentials)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Neveljaven format tokena",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = preveri_jwt_token(token)
        return {
            "valid": True,
            "payload": payload,
            "user_id": payload.get("sub"),
            "username": payload.get("username")
        }
    except HTTPException as e:
        return {
            "valid": False,
            "error": e.detail
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=SERVICE_HOST,
        port=SERVICE_PORT,
        reload=False
    )
