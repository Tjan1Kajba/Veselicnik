from pymongo import MongoClient

client = MongoClient("mongodb://admin:secret@localhost:27017")
db = client["food_order_db"]

orders_collection = db["orders"]
menu_collection = db["menu"]
