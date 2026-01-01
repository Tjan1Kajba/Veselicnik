from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from datetime import datetime
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import os
import requests
from models import Order, StatusUpdate, Payment, MenuItem
from database import orders_collection, menu_collection
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from logger import send_log
import uuid
app = FastAPI(title="Food Ordering Microservice")

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    correlation_id = request.headers.get("X-Correlation-Id", str(uuid.uuid4()))
    request.state.correlation_id = correlation_id
    response = await call_next(request)
    response.headers["X-Correlation-Id"] = correlation_id
    return response
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


JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"

USER_SERVICE_URL = "http://host.docker.internal:8002"

def preveri_jwt_token(token: str):
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            audience="api-clients",
            issuer="uporabniski-sistem",

        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token je potekel")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Neveljaven token")


def get_id_veselica_from_auth(access_token: str):

    url = f"{USER_SERVICE_URL}/uporabnik/prijavljen"
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Cannot fetch user info from Auth service")

    data = response.json()
    id_veselica = data["user"].get("id_veselica")
    if not id_veselica:
        raise HTTPException(status_code=400, detail="User is not registered to any veselica")
    return id_veselica


bearer_scheme = HTTPBearer()


bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    payload = preveri_jwt_token(credentials.credentials)
    return {
        "payload": payload,
        "token": credentials.credentials
    }


def order_serializer(order) -> dict:
    return {
        "id": str(order["_id"]),
        "user_id": order["user_id"],
        "items": order["items"],
        "status": order["status"],
        "paid": order["paid"],
        "total_price": order.get("total_price", 0),
        "id_veselica": order.get("id_veselica") 
                }


@app.get("/menu")
def get_menu(request: Request):
    correlation_id = request.state.correlation_id
    send_log(
        log_type="INFO",
        url="/menu",
        message=f"Created menu request",
        service="narocanje-hrane-service",
        correlation_id=correlation_id
    )

    menu = list(menu_collection.find())
    for item in menu:
        item["_id"] = str(item["_id"])
    return menu

@app.post("/menu")
def add_menu_item(item: MenuItem, request: Request ,user_data: dict = Depends(get_current_user)):
    correlation_id = request.state.correlation_id
    send_log(
        log_type="INFO",
        url="/menu",
        message=f"Created POST menu request",
        service="narocanje-hrane-service",
        correlation_id=correlation_id
    )
    result = menu_collection.insert_one(item.dict())
    return {"id": str(result.inserted_id)}

@app.delete("/menu/{id}")
def delete_menu_item(id: str, user_data: dict = Depends(get_current_user)):
    result = menu_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted"}


@app.post("/orders")
def create_order(order: Order, request: Request ,user_data: dict = Depends(get_current_user)):
    correlation_id = request.state.correlation_id

    access_token = user_data["token"]
    payload = user_data["payload"]

    username = payload.get("username")
    id_veselica = get_id_veselica_from_auth(access_token)
    send_log(
        log_type="INFO",
        url="/orders",
        message=f"User {username} Created POST orders request",
        service="narocanje-hrane-service",
        correlation_id=correlation_id
    )
    total_price = 0.0
    for item in order.items:
        menu_item = menu_collection.find_one({"name": item.item_id})
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item.item_id} not found")
        total_price += menu_item["price"] * item.quantity

    order_dict = order.dict()
    order_dict["total_price"] = total_price
    order_dict["user_id"] = username
    order_dict["id_veselica"] = id_veselica
    order_dict["paid"] = False
    order_dict["status"] = "created"
    order_dict["created_at"] = datetime.utcnow()

    result = orders_collection.insert_one(order_dict)
    return {
        "id": str(result.inserted_id),
        "total_price": total_price,
        "user_id": username,
        "id_veselica": id_veselica
    }

@app.get("/orders")
def get_all_orders(user_data: dict = Depends(get_current_user)):
    orders = orders_collection.find()
    return [order_serializer(order) for order in orders]

@app.get("/orders/user/{user_id}")
def get_user_orders(user_id: str, user_data: dict = Depends(get_current_user)):
    orders = orders_collection.find({"user_id": user_id})
    return [order_serializer(order) for order in orders]

@app.get("/orders/user/{user_id}/paid")
def check_paid_orders(user_id: str, user_data: dict = Depends(get_current_user)):
    count = orders_collection.count_documents({"user_id": user_id, "paid": True})
    return {"has_paid_orders": count > 0}

@app.post("/orders/{id}/status")
def update_order_status(
    id: str,
    status_update: StatusUpdate,
    user_data: dict = Depends(get_current_user)
):
    result = orders_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": status_update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Status updated"}

@app.post("/orders/{id}/pay")
def pay_order(
    id: str,
    payment: Payment,
    user_data: dict = Depends(get_current_user)
):
    id_veselica = user_data.get("id_veselica")
    order = orders_collection.find_one({"_id": ObjectId(id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if payment.amount < order["total_price"]:
        raise HTTPException(status_code=400, detail="Payment amount is less than order total")

    payment.timestamp = datetime.utcnow()

    orders_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"paid": True, "payment": payment.dict()}}
    )

    return {
        "message": "Order paid",
        "total_price": order["total_price"],
        "payment": payment.dict(),
        "id_veselica": id_veselica
    }

@app.delete("/orders/{id}")
def delete_order(id: str, user_data: dict = Depends(get_current_user)):
    result = orders_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}
