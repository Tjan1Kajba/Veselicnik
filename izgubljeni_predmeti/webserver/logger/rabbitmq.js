const amqplib = require("amqplib");
const util = require("util");

const RABBITMQ_HOST = process.env.RABBITMQ_HOST || "rabbitmq";
const RABBITMQ_PORT = process.env.RABBITMQ_PORT || "5672";
const RABBITMQ_USER = process.env.RABBITMQ_USER || "admin";
const RABBITMQ_PASS = process.env.RABBITMQ_PASS || "secret";

const EXCHANGE_NAME = "logging_exchange";
const QUEUE_NAME = "logging_queue";

async function sendLog(logType, route, method, wasSuccessful, message, correlationId) {
    url = "http://izgubljeni_predmeti_web:9000" + route;

    try {
        const amqpUrl = util.format(
            "amqp://%s:%s@%s:%s",
            RABBITMQ_USER,
            RABBITMQ_PASS,
            RABBITMQ_HOST,
            RABBITMQ_PORT
        );

        const conn = await amqplib.connect(amqpUrl, "heartbeat=60");
        const ch = await conn.createChannel();

        await ch.assertExchange(EXCHANGE_NAME, "direct", { durable: true });
        await ch.assertQueue(QUEUE_NAME, { durable: true });
        await ch.bindQueue(QUEUE_NAME, EXCHANGE_NAME, QUEUE_NAME);

        const timestamp = new Date()
            .toISOString()
            .replace("T", " ")
            .replace("Z", "")
            .replace(/\.\d+$/, (m) => "," + m.substring(1, 4));

            let storitevSuccessMEssage = "";
        if (wasSuccessful) {
            storitevSuccessMEssage = 'Uspesen klic storitve';
        } else {
            storitevSuccessMEssage = 'Neuspesen klic storitve';
        }   

        const logMessage = `${timestamp} ${logType} ${url} Correlation: ${correlationId} [izgubljeni predmeti] - ${storitevSuccessMEssage} ${message} ${method} ${route}`;

        ch.publish(
            EXCHANGE_NAME,
            QUEUE_NAME,
            Buffer.from(logMessage, "utf-8"),
            { persistent: true }
        );

        setTimeout(() => {
            ch.close();
            conn.close();
        }, 500);
    } catch (err) {
        console.error("Failed to send log:", err);
    }
}

module.exports = { sendLog };
