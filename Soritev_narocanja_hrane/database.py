import os
from pymongo import MongoClient

MONGO_HOST = os.getenv("MONGO_HOST", "food-mongo")
MONGO_PORT = int(os.getenv("MONGO_PORT", 27017))
MONGO_USERNAME = os.getenv("MONGO_USERNAME", "admin")
MONGO_PASSWORD = os.getenv("MONGO_PASSWORD", "secret")
MONGO_DB = os.getenv("MONGO_DB", "food_order_db")

uri = f"mongodb://{MONGO_USERNAME}:{MONGO_PASSWORD}@{MONGO_HOST}:{MONGO_PORT}/{MONGO_DB}?authSource=admin"

client = MongoClient(uri)
orders_collection = client[MONGO_DB]["orders"]
menu_collection = client[MONGO_DB]["menu"]
