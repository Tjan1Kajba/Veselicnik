from pymongo import MongoClient

client = MongoClient("mongodb://admin:secret@localhost:27017")
db = client["music_service_db"]

requests_collection = db["music_requests"]
