from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from datetime import datetime
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import os

from models import Order, StatusUpdate, Payment, MenuItem
from database import orders_collection, menu_collection

app = FastAPI(title="Food Ordering Microservice")


JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
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

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    return preveri_jwt_token(credentials.credentials)


def order_serializer(order) -> dict:
    return {
        "id": str(order["_id"]),
        "user_id": order["user_id"],
        "items": order["items"],
        "status": order["status"],
        "paid": order["paid"],
        "total_price": order.get("total_price", 0)
    }


@app.get("/menu")
def get_menu():
    menu = list(menu_collection.find())
    for item in menu:
        item["_id"] = str(item["_id"])
    return menu

@app.post("/menu")
def add_menu_item(item: MenuItem, user_data: dict = Depends(get_current_user)):
    result = menu_collection.insert_one(item.dict())
    return {"id": str(result.inserted_id)}

@app.delete("/menu/{id}")
def delete_menu_item(id: str, user_data: dict = Depends(get_current_user)):
    result = menu_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted"}


@app.post("/orders")
def create_order(order: Order, user_data: dict = Depends(get_current_user)):
    username = user_data["username"]
    id_veselica = user_data.get("id_veselica")

    if not id_veselica:
        raise HTTPException(status_code=400, detail="User is not registered to any veselica")

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
        "payment": payment.dict()
    }

@app.delete("/orders/{id}")
def delete_order(id: str, user_data: dict = Depends(get_current_user)):
    result = orders_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}
