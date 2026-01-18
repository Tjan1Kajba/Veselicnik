# logger.py
import pika
import os
from datetime import datetime

RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'rabbitmq')
RABBITMQ_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBITMQ_USER = os.getenv('RABBITMQ_USER', 'admin')
RABBITMQ_PASS = os.getenv('RABBITMQ_PASS', 'secret')
EXCHANGE_NAME = 'logging_exchange'
QUEUE_NAME = 'logging_queue'

def get_rabbitmq_connection():
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASS)
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=RABBITMQ_HOST, port=RABBITMQ_PORT, credentials=credentials)
    )
    channel = connection.channel()
    # Enak tip exchange kot pri send_log
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type='direct', durable=True)
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME)
    return connection



def send_log(log_type: str, url: str, message: str, service: str, correlation_id: str):
    """Pošlji log v RabbitMQ"""
    try:
        connection = get_rabbitmq_connection()
        channel = connection.channel()

        # Ustvari exchange in queue, če še ne obstajata
        channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type='direct', durable=True)
        channel.queue_declare(queue=QUEUE_NAME, durable=True)
        channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME)

        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]

        log_message = f"{timestamp} {log_type} {url} Correlation: {correlation_id} [{service}] - {message}"

        channel.basic_publish(
            exchange=EXCHANGE_NAME,
            routing_key=QUEUE_NAME,
            body=log_message.encode('utf-8')
        )

        connection.close()
    except Exception as e:
        print(f"Failed to send log: {e}")
