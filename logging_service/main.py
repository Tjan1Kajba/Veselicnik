from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
from pydantic import BaseModel
from typing import List
from datetime import datetime
import pika
import os
import re

MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://logging-mongo:27017/logging_db')
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'rabbitmq')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'admin')
RABBITMQ_PASS = os.getenv('RABBITMQ_PASS', 'secret')
EXCHANGE_NAME = 'logging_exchange'
QUEUE_NAME = 'logging_queue'

mongo_client = None
logs_collection = None

def init_database():
    global mongo_client, logs_collection
    try:
        mongo_client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command('ping')
        db = mongo_client["logging_db"]
        logs_collection = db["logs"]
        print("Logging DB connection successful")
        return True
    except Exception as e:
        print(f"Logging DB connection error: {e}")
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

def parse_log_message(log_message: str):
    pattern = r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) (\w+) (.+?) Correlation: ([a-f0-9-]+) \[(.+?)\] - (.+)'
    match = re.match(pattern, log_message)
    if match:
        timestamp_str, level, url, correlation_id, app_name, message = match.groups()
        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')
        return {
            "timestamp": timestamp,
            "level": level,
            "url": url,
            "correlation_id": correlation_id,
            "app_name": app_name,
            "message": message
        }
    else:
        return {
            "timestamp": datetime.utcnow(),
            "level": "UNKNOWN",
            "url": "",
            "correlation_id": "",
            "app_name": "",
            "message": log_message
        }

class LogEntry(BaseModel):
    timestamp: str
    level: str
    url: str
    correlation_id: str
    app_name: str
    message: str

app = FastAPI(title="Logging Service")

@app.post("/logs")
async def consume_logs():
    if mongo_client is None or logs_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        connection = get_rabbitmq_connection()
        channel = connection.channel()

        logs_consumed = 0
        while True:
            method_frame, header_frame, body = channel.basic_get(queue=QUEUE_NAME, auto_ack=True)
            if method_frame:
                log_message = body.decode('utf-8')
                print(f"Raw log message: '{log_message}'")

                # Parse the log message into structured data
                log_data = parse_log_message(log_message)
                logs_collection.insert_one(log_data)
                logs_consumed += 1
                print(f"Stored parsed log: {log_data}")
            else:
                break

        connection.close()
        return {"message": f"Consumed {logs_consumed} logs"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consuming logs: {str(e)}")

@app.get("/logs/{datumOd}/{datumDo}", response_model=List[LogEntry])
async def get_logs(datumOd: str, datumDo: str):
    if mongo_client is None or logs_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        start_date = datetime.strptime(datumOd, '%Y-%m-%d')
        end_date = datetime.strptime(datumDo, '%Y-%m-%d').replace(hour=23, minute=59, second=59)

        logs = list(logs_collection.find({
            "timestamp": {
                "$gte": start_date,
                "$lte": end_date
            }
        }, {"_id": 0}).sort("timestamp", 1))

        for log in logs:
            log['timestamp'] = log['timestamp'].isoformat()

        return logs

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {str(e)}")

@app.delete("/logs")
async def delete_logs():
    if mongo_client is None or logs_collection is None:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        result = logs_collection.delete_many({})
        return {"message": f"Deleted {result.deleted_count} logs"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting logs: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
