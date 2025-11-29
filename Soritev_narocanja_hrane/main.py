from fastapi import FastAPI, HTTPException
from bson import ObjectId
from models import Order, StatusUpdate, Payment, MenuItem
from database import orders_collection, menu_collection
from datetime import datetime
import requests

app = FastAPI(title="Food Ordering Microservice")

def get_logged_in_user(session_token: str):
    headers = {"Cookie": f"session_token={session_token}"}
    r = requests.get("http://USER_SERVICE_HOST:8000/uporabnik/prijavljen", headers=headers)
    if r.status_code == 200:
        return r.json()
    return None

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

@app.get("/orders/user/{user_id}")
def get_user_orders(user_id: str):
    orders = orders_collection.find({"user_id": user_id})
    return [order_serializer(order) for order in orders]


@app.post("/menu")
def add_menu_item(item: MenuItem):
    result = menu_collection.insert_one(item.dict())
    return {"id": str(result.inserted_id)}

@app.post("/orders")
def create_order(order: Order):
    total_price = 0.0
    for item in order.items:
        menu_item = menu_collection.find_one({"name": item.item_id})
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item.item_id} not found")
        total_price += menu_item["price"] * item.quantity

    order_dict = order.dict()
    order_dict["total_price"] = total_price 

    result = orders_collection.insert_one(order_dict)
    return {"id": str(result.inserted_id), "total_price": total_price}



@app.post("/orders/{id}/status")
def update_order_status(id: str, status_update: StatusUpdate):
    result = orders_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": status_update.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Status updated"}

@app.get("/orders/user/{user_id}")
def get_user_orders(user_id: str):
    orders = orders_collection.find({"user_id": user_id})
    return [order_serializer(order) for order in orders]

@app.get("/orders")
def get_all_orders():
    orders = orders_collection.find()
    return [order_serializer(order) for order in orders]

@app.get("/orders/user/{user_id}/paid")
def check_paid_orders(user_id: str):
    count = orders_collection.count_documents({"user_id": user_id, "paid": True})
    return {"has_paid_orders": count > 0}


@app.post("/orders/{id}/pay")
def pay_order(id: str, payment: Payment):
    order = orders_collection.find_one({"_id": ObjectId(id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if payment.amount < order["total_price"]:
        raise HTTPException(status_code=400, detail="Payment amount is less than order total")

    payment.timestamp = datetime.utcnow()
    result = orders_collection.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"paid": True, "payment": payment.dict()}}
    )
    return {"message": "Order paid", "total_price": order["total_price"], "payment": payment.dict()}

@app.delete("/orders/{id}")
def delete_order(id: str):
    result = orders_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order deleted"}

@app.delete("/menu/{id}")
def delete_menu_item(id: str):
    result = menu_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted"}
