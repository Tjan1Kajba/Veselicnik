from fastapi import FastAPI, Request, Depends, HTTPException, status, Cookie, Response
from .statistika_client import poslji_statistiko
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pymongo import MongoClient
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, PyJWTError
import secrets
import json
import os
import jwt
import pika
import uuid
import logging


JWT_SECRET_KEY = os.getenv(
    'JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', 30))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(
    os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', 7))

JWT_ISSUER = os.getenv('JWT_ISSUER', 'uporabniski-sistem')
JWT_AUDIENCE = os.getenv('JWT_AUDIENCE', 'api-clients')

security = HTTPBearer(auto_error=False)

MONGODB_URL = os.getenv(
    'MONGODB_URL', 'mongodb://localhost:27017/uporabniski_sistem')
SERVICE_HOST = os.getenv('SERVICE_HOST', '0.0.0.0')
SERVICE_PORT = int(os.getenv('SERVICE_PORT', 8000))

RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'rabbitmq')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'admin')
RABBITMQ_PASS = os.getenv('RABBITMQ_PASS', 'secret')
EXCHANGE_NAME = 'logging_exchange'
QUEUE_NAME = 'logging_queue'

mongo_client = None
users_collection = None
veselice_collection = None
sessions_collection = None


def init_database():
    global mongo_client, users_collection, veselice_collection, sessions_collection

    try:
        mongo_client = MongoClient(
            MONGODB_URL,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        mongo_client.admin.command('ping')
        db = mongo_client["uporabniski_sistem"]
        users_collection = db["uporabniki"]
        veselice_collection = db["veselice"]
        sessions_collection = db["seje"]
        print("MongoDB connection successful")
        return True
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        mongo_client = None
        users_collection = None
        veselice_collection = None
        sessions_collection = None
        return False


db_initialized = init_database()


def get_rabbitmq_connection():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    connection = pika.BlockingConnection(pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials
    ))
    return connection


def send_log(timestamp, level, url, correlation_id, app_name, message):
    try:
        log_message = f"{timestamp} {level} {url} Correlation: {correlation_id} [{app_name}] - {message}"
        print(f"LOG MESSAGE: {log_message}")
        connection = get_rabbitmq_connection()
        print("RabbitMQ connection established")
        channel = connection.channel()
        channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type='direct', durable=True)
        channel.queue_declare(queue=QUEUE_NAME, durable=True)
        channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME, routing_key='')
        channel.basic_publish(
            exchange=EXCHANGE_NAME,
            routing_key='',
            body=log_message,
            properties=pika.BasicProperties(delivery_mode=2)
        )
        print("Log published successfully")
        connection.close()
    except Exception as e:
        print(f"Failed to send log: {e}")
        import traceback
        traceback.print_exc()


def log_request(request, message, level='INFO'):
    correlation_id = getattr(request.state, 'correlation_id', 'unknown')
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S,%f')[:-3]
    url = str(request.url)
    app_name = 'storitev_uporabniskega_sistema'
    send_log(timestamp, level, url, correlation_id, app_name, message)


app = FastAPI(
    title="Uporabniški Sistem",
    description="Storitev za upravljanje uporabnikov in sej z JWT avtentikacijo",
    version="1.0.2",
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "docExpansion": "list",
        "tryItOutEnabled": True,
        "syntaxHighlight": True,
    },
)

app.openapi_tags = [
    {
        "name": "Sistem registracije in prijave",
        "description": "Operacije za registracijo, prijavo, odjavo in osveževanje tokenov"
    },
    {
        "name": "Podatki uporabnika",
        "description": "Pridobivanje in upravljanje z uporabniškimi podatki"
    },
    {
        "name": "Posodobi uporabnika",
        "description": "Posodabljanje uporabniških podatkov in gesel"
    },
    {
        "name": "Izbriši uporabnika",
        "description": "Brisanje uporabniških računov"
    },
    {
        "name": "Veselice",
        "description": "Upravljanje z veselicami in prijavami"
    },
    {
        "name": "JWT Avtentikacija",
        "description": "Preverjanje in validacija JWT tokenov"
    }
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://frontend_user:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://localhost:8001",
        "http://localhost:8002",
        "http://localhost:8003",
        "http://localhost:8004",
    ],
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
    id_veselica: Optional[str] = None


class PrijavaUporabnika(BaseModel):
    uporabnisko_ime_ali_email: str
    geslo: str


class PrijavljenOdgovor(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: OdgovorUporabnika


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

    @field_validator('novo_geslo')
    def preveri_dolzino_gesla(cls, v):
        if len(v) < 4:
            raise ValueError('Geslo mora biti vsaj 4 znake dolgo')
        return v

    @model_validator(mode="after")
    def gesli_se_ujemata(self):
        """
        Pydantic v2 kompatibilna validacija, ki preveri ujemanje gesel.
        """
        if self.novo_geslo != self.ponovitev_novega_gesla:
            raise ValueError(
                "Novo geslo in ponovitev novega gesla se ne ujemata")
        return self


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class TokenForVerification(BaseModel):
    token: str


class UstvariVeselico(BaseModel):
    cas: datetime
    lokacija: str
    ime_veselice: str
    max_udelezencev: int = 0
    starost_za_vstop: Optional[int] = 18
    opis_dogodka: Optional[str] = None


class OdgovorVeselice(UstvariVeselico):
    id: str
    ustvaril_uporabnik_id: str
    ustvaril_uporabnik_ime: str
    ustvarjeno: datetime
    prijavljeni_uporabniki: List[str] = []
    st_pirjaveljenih: int = 0
    max_udelezencev: int = 0


class OdgovorVeseliceDetail(OdgovorVeselice):
    prijavljeni_uporabniki_podatki: List[str] = []


class PrijavaNaVeselico(BaseModel):
    veselica_id: str


pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def ustvari_jwt_token(data: Dict[str, Any], token_type: str = "access") -> str:
    """
    Ustvari JWT token z vsemi zahtevanimi atributi.
    """
    to_encode = data.copy()

    if "sub" not in to_encode:
        raise ValueError("JWT token mora vsebovati 'sub' (subject) claim")

    if token_type == "refresh":
        expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        expires_delta = timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_delta = timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "jti": secrets.token_urlsafe(16),
        "type": token_type,
        "exp_delta": int(expires_delta.total_seconds())
    })

    if token_type == "access":
        to_encode["name"] = to_encode.get("name", "")
        to_encode["username"] = to_encode.get("username", "")

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
        "user_type": user_data.get("tip_uporabnika", "normal"),
    }
    return ustvari_jwt_token(token_data, token_type="access")


def ustvari_refresh_token(user_id: str) -> str:
    """
    Ustvari refresh token za uporabnika.
    """
    token_data = {
        "sub": user_id,
    }
    return ustvari_jwt_token(token_data, token_type="refresh")


def preveri_jwt_token(token: str, token_type: str = "access") -> Dict[str, Any]:
    """
    Preveri veljavnost JWT tokena in vrne podatke.
    """
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER
        )

        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Neveljaven tip tokena. Pričakovan: {token_type}",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if mongo_client is not None and sessions_collection is not None:
            token_id = payload.get("jti")
            if token_id:
                revoked_token = sessions_collection.find_one({
                    "token_id": token_id,
                    "type": "blacklist"
                })
                if revoked_token:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token je preklican",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
        return payload

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token je potekel",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Neveljaven token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Napaka pri preverbi tokena: {str(e)}",
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
    token: HTTPAuthorizationCredentials = Depends(security),
    session_token: str = Cookie(None)
) -> Optional[Dict[str, Any]]:
    """
    Pridobi trenutnega uporabnika iz JWT tokena ali seje.
    """
    if token:
        jwt_token = pridobi_token_iz_zaglavja(token)
        if jwt_token:
            try:
                payload = preveri_jwt_token(jwt_token, token_type="access")
                user_id = payload.get("sub")
                if user_id:
                    if mongo_client is None:
                        raise HTTPException(
                            status_code=503, detail="Baza ni na voljo")

                    user = users_collection.find_one(
                        {"_id": ObjectId(user_id)})
                    if user:
                        user["id"] = str(user["_id"])
                        return user

            except HTTPException:
                raise
            except Exception:
                pass

    if session_token and mongo_client is not None:
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


def zahtevaj_admin_pravice(current_user: Dict[str, Any] = Depends(zahtevaj_avtentikacijo)):
    """
    Zahteva, da je uporabnik tipa admin.
    """
    if current_user.get("tip_uporabnika") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Za to akcijo potrebujete administratorske pravice"
        )
    return current_user


def pridobi_veselico_za_uporabnika(user_id: str) -> Optional[str]:
    """
    Poišči veselico, na katero je uporabnik prijavljen.
    Vrne ID veselice ali None, če ni prijavljen na nobeno veselico.
    """
    if mongo_client is None or veselice_collection is None:
        return None

    try:
        veselica = veselice_collection.find_one({
            "prijavljeni_uporabniki": {"$in": [user_id]}
        })

        if veselica:
            return str(veselica["_id"])
    except Exception:
        pass

    return None


def ustvari_sejo(user_id: str, username: str) -> str:
    """
    Ustvari novo sejo v MongoDB.
    """
    if mongo_client is None or sessions_collection is None:
        raise HTTPException(status_code=503, detail="Storitev sej ni na voljo")

    session_token = secrets.token_urlsafe(32)
    session_data = {
        "session_token": session_token,
        "user_id": user_id,
        "username": username,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(hours=24),
        "type": "session"
    }

    try:
        sessions_collection.insert_one(session_data)
        return session_token
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri ustvarjanju seje: {str(e)}"
        )


def pridobi_sejo(session_token: str) -> Optional[dict]:
    """
    Pridobi sejo iz MongoDB.
    """
    if mongo_client is None or sessions_collection is None or not session_token:
        return None

    try:
        session_data = sessions_collection.find_one({
            "session_token": session_token,
            "type": "session",
            "expires_at": {"$gt": datetime.utcnow()}
        })

        if session_data:
            session_data["_id"] = str(session_data["_id"])
            return session_data
    except Exception:
        pass

    return None


def prekini_sejo(session_token: str):
    """
    Prekini sejo v MongoDB.
    """
    if mongo_client is not None and sessions_collection is not None and session_token:
        try:
            sessions_collection.delete_one({"session_token": session_token})
        except Exception:
            pass


def dodaj_token_na_crno_listo(token: str):
    """
    Dodaj token na črno listo (preklicane tokenje).
    """
    if mongo_client is not None and sessions_collection is not None:
        try:
            payload = jwt.decode(
                token,
                JWT_SECRET_KEY,
                algorithms=[JWT_ALGORITHM],
                options={"verify_signature": False}
            )

            token_id = payload.get("jti")
            exp_timestamp = payload.get("exp")

            if token_id and exp_timestamp:
                expires_at = datetime.fromtimestamp(exp_timestamp)

                blacklist_entry = {
                    "token_id": token_id,
                    "expires_at": expires_at,
                    "added_at": datetime.utcnow(),
                    "type": "blacklist"
                }

                sessions_collection.insert_one(blacklist_entry)
        except Exception:
            pass


def zakodiraj_geslo(geslo: str) -> str:
    return pwd_context.hash(geslo)


def preveri_geslo(geslo: str, zakodirano_geslo: str) -> bool:
    return pwd_context.verify(geslo, zakodirano_geslo)


@app.post("/uporabnik/registracija", tags=["Sistem registracije in prijave"], response_model=OdgovorUporabnika)
async def registracija(request: Request, podatki: UstvariUporabnika):
    """
    Registracija novega uporabnika.
    """
    print("Registration called")
    log_request(request, "Klic storitve POST /uporabnik/registracija")
    poslji_statistiko("/uporabnik/registracija")
    if mongo_client is None:
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
async def prijava(request: Request, podatki: PrijavaUporabnika, response: Response):
    """
    Prijava uporabnika z uporabniškim imenom ali emailom in geslom.
    Vrne JWT access in refresh token.
    """
    log_request(request, "Klic storitve POST /uporabnik/prijava")
    poslji_statistiko("/uporabnik/prijava")
    if mongo_client is None:
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

    if mongo_client is not None and sessions_collection is not None:
        try:
            refresh_payload = jwt.decode(
                refresh_token,
                JWT_SECRET_KEY,
                algorithms=[JWT_ALGORITHM],
                options={"verify_signature": False}
            )

            refresh_token_data = {
                "token_id": refresh_payload.get("jti"),
                "user_id": str(user["_id"]),
                "type": "refresh_token",
                "created_at": datetime.utcnow(),
                "expires_at": datetime.fromtimestamp(refresh_payload.get("exp"))
            }

            sessions_collection.insert_one(refresh_token_data)
        except Exception as e:
            print(f"Napaka pri shranjevanju refresh tokena: {e}")

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
async def osvezi_token(request: Request, podatki: RefreshTokenRequest):
    """
    Osveži access token z uporabo refresh tokena.
    """
    log_request(request, "Klic storitve POST /auth/refresh")
    poslji_statistiko("/auth/refresh")
    try:
        payload = preveri_jwt_token(
            podatki.refresh_token, token_type="refresh")

        user_id = payload.get("sub")
        token_id = payload.get("jti")

        if not user_id or not token_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Neveljaven token"
            )

        if mongo_client is not None and sessions_collection is not None:
            stored_token = sessions_collection.find_one({
                "token_id": token_id,
                "user_id": user_id,
                "type": "refresh_token"
            })

            if not stored_token:
                try:
                    refresh_token_data = {
                        "token_id": token_id,
                        "user_id": user_id,
                        "type": "refresh_token",
                        "created_at": datetime.utcnow(),
                        "expires_at": datetime.fromtimestamp(payload.get("exp"))
                    }

                    sessions_collection.insert_one(refresh_token_data)
                    print(f"Dodan nov refresh token v bazo: {token_id}")
                except Exception as e:
                    print(
                        f"Napaka pri shranjevanju refresh tokena v bazo: {e}")

        if mongo_client is None:
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
    Odjava trenutnega uporabnika. Prekliče JWT token in sejo.
    """
    log_request(request, "Klic storitve POST /uporabnik/odjava")
    poslji_statistiko("/uporabnik/odjava")
    session_token = request.cookies.get("session_token")

    if session_token:
        prekini_sejo(session_token)

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        dodaj_token_na_crno_listo(token)

    response.delete_cookie("session_token")

    return {"sporocilo": "Odjava uspešna"}


@app.get("/uporabnik/prijavljen", tags=["Podatki uporabnika"], response_model=PrijavljenOdgovor)
async def prijavljen_uporabnik(request: Request, current_user: dict = Depends(zahtevaj_avtentikacijo)):
    """
    Pridobi podatke o prijavljenem uporabniku in vrne nove JWT tokene.
    """
    log_request(request, "Klic storitve GET /uporabnik/prijavljen")
    poslji_statistiko("/uporabnik/prijavljen")
    access_token = ustvari_access_token(current_user)
    refresh_token = ustvari_refresh_token(current_user["id"])

    id_veselice = pridobi_veselico_za_uporabnika(current_user["id"])

    user_data = current_user.copy()
    if id_veselice:
        user_data["id_veselica"] = id_veselice

    user_response = OdgovorUporabnika(**user_data)

    return PrijavljenOdgovor(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_response
    )


@app.get("/uporabniki", tags=["Podatki uporabnika"], response_model=List[OdgovorUporabnika])
async def vsi_uporabniki(request: Request, current_user: dict = Depends(zahtevaj_avtentikacijo)):
    """
    Pridobi seznam vseh uporabnikov. 
    """
    log_request(request, "Klic storitve GET /uporabniki")
    poslji_statistiko("/uporabniki")
    if mongo_client is None:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        users = list(users_collection.find())
        user_responses = []

        for user in users:
            user["id"] = str(user["_id"])

            id_veselice = pridobi_veselico_za_uporabnika(user["id"])
            user_response = OdgovorUporabnika(**user)

            if id_veselice:
                user_response_dict = user_response.dict()
                user_response_dict["id_veselica"] = id_veselice
                user_responses.append(OdgovorUporabnika(**user_response_dict))
            else:
                user_responses.append(user_response)

        return user_responses

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Napaka pri pridobivanju uporabnikov: {str(e)}")


@app.put("/uporabnik/posodobi-uporabnika", tags=["Posodobi uporabnika"], response_model=OdgovorUporabnika)
async def posodobi_uporabnika(
    request: Request,
    podatki: PosodobiUporabnika,
    current_user: dict = Depends(zahtevaj_avtentikacijo)
):
    """
    Posodobi podatke trenutnega uporabnika.
    """
    log_request(request, "Klic storitve PUT /uporabnik/posodobi-uporabnika")
    poslji_statistiko("/uporabnik/posodobi-uporabnika")
    if mongo_client is None:
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
        request: Request,
        podatki: SpremeniGeslo,
        current_user: dict = Depends(zahtevaj_avtentikacijo)):
    """
    Spremeni geslo trenutnega uporabnika.
    """
    log_request(request, "Klic storitve PATCH /uporabnik/posodobi-uporabnika/spremeni-geslo")
    poslji_statistiko("/uporabnik/posodobi-uporabnika/spremeni-geslo")
    if mongo_client is None:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:

        if podatki.novo_geslo != podatki.ponovitev_novega_gesla:
            raise HTTPException(
                status_code=400,
                detail="Novo geslo in ponovitev novega gesla se ne ujemata"
            )

        if len(podatki.novo_geslo) < 4:
            raise HTTPException(
                status_code=400,
                detail="Geslo mora biti vsaj 4 znake dolgo"
            )

        novo_zakodirano_geslo = zakodiraj_geslo(podatki.novo_geslo)
        result = users_collection.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": {
                "zakodirano_geslo": novo_zakodirano_geslo,
                "posodobljeno": datetime.utcnow()
            }}
        )

        if result.matched_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Uporabnik ni najden"
            )

        if result.modified_count == 0:
            return {
                "sporocilo": "Geslo je ostalo nespremenjeno (novo geslo je enako prejšnjemu)",
                "uporabnik": {
                    "id": current_user["id"],
                    "uporabnisko_ime": current_user["uporabnisko_ime"]
                }
            }

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
    poslji_statistiko("/uporabnik/izbrisi-racun")
    if mongo_client is None:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        user_id = current_user["id"]

        if mongo_client is not None and sessions_collection is not None:
            refresh_tokens = sessions_collection.find({
                "user_id": user_id,
                "type": "refresh_token"
            })

            for token_doc in refresh_tokens:
                dodaj_token_na_crno_listo(token_doc.get("token_id", ""))

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
    request: Request,
    uporabnisko_ime: str,
    current_user: dict = Depends(zahtevaj_avtentikacijo)
):
    """
    Izbriši uporabnika po uporabniškem imenu. 
    """
    log_request(request, f"Klic storitve DELETE /uporabnik/izbrisi-racun/{uporabnisko_ime}")
    poslji_statistiko(f"/uporabnik/izbrisi-racun/{uporabnisko_ime}")
    if mongo_client is None:
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

        if mongo_client is not None and sessions_collection is not None:
            refresh_tokens = sessions_collection.find({
                "user_id": user_to_delete_id,
                "type": "refresh_token"
            })

            for token_doc in refresh_tokens:
                dodaj_token_na_crno_listo(token_doc.get("token_id", ""))

        result = users_collection.delete_one(
            {"_id": ObjectId(user_to_delete_id)})

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Napaka pri brisanju uporabnika"
            )

        if mongo_client is not None and sessions_collection is not None:
            sessions_collection.delete_many({"user_id": user_to_delete_id})

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


@app.post("/veselice", tags=["Veselice"], response_model=OdgovorVeselice)
async def ustvari_veselico(
    request: Request,
    podatki: UstvariVeselico,
    current_user: dict = Depends(zahtevaj_admin_pravice)
):
    """
    Ustvari novo veselico. 
    Dostop imajo samo uporabniki tipa admin.
    """
    log_request(request, "Klic storitve POST /veselice")
    poslji_statistiko("/veselice")
    if mongo_client is None or veselice_collection is None:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        veselica = podatki.model_dump()
        veselica["ustvaril_uporabnik_id"] = current_user["id"]
        veselica["ustvaril_uporabnik_ime"] = current_user["uporabnisko_ime"]
        veselica["ustvarjeno"] = datetime.utcnow()
        veselica["prijavljeni_uporabniki"] = []
        veselica["st_pirjaveljenih"] = 0
        
        # Preveri, če je nastavljen max_udelezencev
        if "max_udelezencev" not in veselica:
            veselica["max_udelezencev"] = 0

        result = veselice_collection.insert_one(veselica)
        veselica["id"] = str(result.inserted_id)

        return OdgovorVeselice(**veselica)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri ustvarjanju veselice: {str(e)}"
        )


@app.get("/veselice", tags=["Veselice"], response_model=List[OdgovorVeselice])
async def pridobi_vse_veselice(
    request: Request,
    current_user: dict = Depends(zahtevaj_avtentikacijo)
):
    """
    Pridobi seznam vseh veselic.
    Dostop imajo vsi prijavljeni uporabniki.
    """
    log_request(request, "Klic storitve GET /veselice")
    poslji_statistiko("/veselice")
    if mongo_client is None or veselice_collection is None:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        veselice = list(veselice_collection.find())
        for veselica in veselice:
            veselica["id"] = str(veselica["_id"])
        return [OdgovorVeselice(**veselica) for veselica in veselice]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri pridobivanju veselic: {str(e)}"
        )


@app.get("/veselice/{veselica_id}", tags=["Veselice"], response_model=OdgovorVeseliceDetail)
async def pridobi_veselico(
    request: Request,
    veselica_id: str,
    current_user: dict = Depends(zahtevaj_avtentikacijo)
):
    """
    Pridobi podatke o posamezni veselici.
    """
    log_request(request, f"Klic storitve GET /veselice/{veselica_id}")
    poslji_statistiko(f"/veselice/{veselica_id}")
    if mongo_client is None or veselice_collection is None:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        veselica = veselice_collection.find_one({"_id": ObjectId(veselica_id)})
        if not veselica:
            raise HTTPException(
                status_code=404,
                detail="Veselica ne obstaja"
            )
        
        veselica["id"] = str(veselica["_id"])
        
        # Pridobi podatke o prijavljenih uporabnikih
        prijavljeni_ids = veselica.get("prijavljeni_uporabniki", [])
        prijavljeni_podatki = []
        
        if prijavljeni_ids and users_collection is not None:
            # Pretvori string IDje v ObjectId
            object_ids = []
            for uid in prijavljeni_ids:
                try:
                    object_ids.append(ObjectId(uid))
                except:
                    pass
            
            users = users_collection.find(
                {"_id": {"$in": object_ids}},
                {"uporabnisko_ime": 1}
            )
            
            for user in users:
                prijavljeni_podatki.append(user["uporabnisko_ime"])
        
        veselica["prijavljeni_uporabniki_podatki"] = prijavljeni_podatki
        
        return OdgovorVeseliceDetail(**veselica)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri pridobivanju veselice: {str(e)}"
        )


@app.post("/veselice/{veselica_id}/prijava", tags=["Veselice"])
async def prijava_na_veselico(
    request: Request,
    veselica_id: str,
    current_user: dict = Depends(zahtevaj_avtentikacijo)
):
    """
    Prijavi trenutnega uporabnika na veselico.
    """
    log_request(request, f"Klic storitve POST /veselice/{veselica_id}/prijava")
    poslji_statistiko(f"/veselice/{veselica_id}/prijava")
    if mongo_client is None or veselice_collection is None:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        veselica = veselice_collection.find_one({"_id": ObjectId(veselica_id)})
        if not veselica:
            raise HTTPException(
                status_code=404,
                detail="Veselica ne obstaja"
            )

        user_id = current_user["id"]
        user_name = current_user["uporabnisko_ime"]

        if user_id in veselica.get("prijavljeni_uporabniki", []):
            raise HTTPException(
                status_code=400,
                detail="Ste že prijavljeni na to veselico"
            )

        st_pirjaveljenih = veselica.get("st_pirjaveljenih", 0)
        max_udelezencev = veselica.get("max_udelezencev", 0)

        if max_udelezencev > 0 and st_pirjaveljenih >= max_udelezencev:
            raise HTTPException(
                status_code=400,
                detail="Veselica je že polna"
            )

        result = veselice_collection.update_one(
            {"_id": ObjectId(veselica_id)},
            {
                "$push": {"prijavljeni_uporabniki": user_id},
                "$inc": {"st_pirjaveljenih": 1}
            }
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Napaka pri prijavi na veselico"
            )

        return {
            "sporocilo": "Uspešno prijavljeni na veselico",
            "veselica": {
                "id": veselica_id,
                "ime": veselica["ime_veselice"],
                "cas": veselica["cas"],
                "lokacija": veselica["lokacija"],
                "st_pirjaveljenih": st_pirjaveljenih + 1
            },
            "uporabnik": {
                "id": user_id,
                "uporabnisko_ime": user_name
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri prijavi na veselico: {str(e)}"
        )


@app.post("/veselice/{veselica_id}/odjava", tags=["Veselice"])
async def odjava_z_veselice(
    request: Request,
    veselica_id: str,
    current_user: dict = Depends(zahtevaj_avtentikacijo)
):
    """
    Odjavi trenutnega uporabnika z veselice.
    """
    log_request(request, f"Klic storitve POST /veselice/{veselica_id}/odjava")
    poslji_statistiko(f"/veselice/{veselica_id}/odjava")
    if mongo_client is None or veselice_collection is None:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        veselica = veselice_collection.find_one({"_id": ObjectId(veselica_id)})
        if not veselica:
            raise HTTPException(
                status_code=404,
                detail="Veselica ne obstaja"
            )

        user_id = current_user["id"]
        user_name = current_user["uporabnisko_ime"]

        if user_id not in veselica.get("prijavljeni_uporabniki", []):
            raise HTTPException(
                status_code=400,
                detail="Niste prijavljeni na to veselico"
            )

        result = veselice_collection.update_one(
            {"_id": ObjectId(veselica_id)},
            {
                "$pull": {"prijavljeni_uporabniki": user_id},
                "$inc": {"st_pirjaveljenih": -1}
            }
        )

        if result.modified_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Napaka pri odjavi z veselice"
            )

        return {
            "sporocilo": "Uspešno odjavljeni z veselice",
            "veselica": {
                "id": veselica_id,
                "ime": veselica["ime_veselice"],
                "st_pirjaveljenih": veselica.get("st_pirjaveljenih", 0) - 1
            },
            "uporabnik": {
                "id": user_id,
                "uporabnisko_ime": user_name
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri odjavi z veselice: {str(e)}"
        )


@app.delete("/veselice/{veselica_id}", tags=["Veselice"], response_model=dict)
async def izbrisi_veselico(
    request: Request,
    veselica_id: str,
    current_user: dict = Depends(zahtevaj_admin_pravice)
):
    """
    Izbriši veselico. 
    Dostop imajo samo uporabniki tipa admin.
    """
    log_request(request, f"Klic storitve DELETE /veselice/{veselica_id}")
    poslji_statistiko(f"/veselice/{veselica_id}")
    if mongo_client is None or veselice_collection is None:
        raise HTTPException(status_code=503, detail="Baza ni na voljo")

    try:
        veselica = veselice_collection.find_one({"_id": ObjectId(veselica_id)})
        if not veselica:
            raise HTTPException(
                status_code=404,
                detail="Veselica ne obstaja"
            )

        result = veselice_collection.delete_one({"_id": ObjectId(veselica_id)})

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=500,
                detail="Napaka pri brisanju veselice"
            )

        return {
            "sporocilo": "Veselica uspešno izbrisana",
            "veselica": {
                "id": veselica_id,
                "ime": veselica["ime_veselice"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Napaka pri brisanju veselice: {str(e)}"
        )


@app.post("/auth/verify-token", tags=["JWT Avtentikacija"])
async def verify_token_via_body(request: Request, podatki: TokenForVerification):
    """
    Preveri veljavnost JWT tokena preko request bodyja.
    Uporabno za direktno testiranje brez Authorization headerja.
    """
    log_request(request, "Klic storitve POST /auth/verify-token")
    poslji_statistiko("/auth/verify-token")
    try:
        payload = preveri_jwt_token(podatki.token, token_type="access")
        return {
            "valid": True,
            "user_id": payload.get("sub"),
            "username": payload.get("username"),
            "email": payload.get("email"),
            "user_type": payload.get("user_type")
        }
    except HTTPException as e:
        return {
            "valid": False,
            "error": e.detail
        }


@app.middleware("http")
async def preveri_jwt_middleware(request: Request, call_next):
    """
    Middleware za avtomatično preverjanje JWT tokenov v zahtevkih.
    """
    public_paths = [
        "/docs", "/redoc", "/openapi.json",
        "/uporabnik/prijava", "/uporabnik/registracija",
        "/auth/refresh", "/auth/verify-token", "/auth/swagger-token"
    ]

    request.state.correlation_id = str(uuid.uuid4())

    if request.url.path in public_paths or request.url.path.startswith("/static"):
        return await call_next(request)

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            token = auth_header.replace("Bearer ", "")
            payload = preveri_jwt_token(token, token_type="access")
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


def ustvari_admin_racun():
    """
    Ustvari admin uporabnika, če še ne obstaja.
    """
    try:
        if users_collection is None:
            print("Users collection ni inicializiran")
            return

        admin_user = users_collection.find_one({"uporabnisko_ime": "admin"})

        if not admin_user:
            admin_data = {
                "uporabnisko_ime": "admin",
                "email": "admin@example.com",
                "zakodirano_geslo": zakodiraj_geslo("admin"),
                "ime": "Administrator",
                "priimek": "Sistema",
                "tip_uporabnika": "admin",
                "ustvarjeno": datetime.utcnow(),
                "posodobljeno": None,
                "id_veselica": None
            }

            result = users_collection.insert_one(admin_data)
            print(
                f"Admin uporabnik uspešno ustvarjen z ID: {result.inserted_id}")
            print("Prijavni podatki: uporabnisko_ime=admin, geslo=admin")
        else:
            print("Admin uporabnik že obstaja")

    except Exception as e:
        print(f"Napaka pri ustvarjanju admin uporabnika: {e}")


@app.on_event("startup")
async def startup_event():
    ustvari_admin_racun()
    print(f"Swagger UI: http://localhost:{SERVICE_PORT}/docs")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=SERVICE_HOST,
        port=SERVICE_PORT,
        reload=False
    )
