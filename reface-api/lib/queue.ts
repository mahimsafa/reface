// queue.js
import amqp from "amqplib";

const RABBITMQ_URL = "amqp://devuser:devpass@localhost:5672";
const QUEUE_NAME = "test_queue";

let channel, connection;

export async function connectQueue() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log("✅ Connected to RabbitMQ");
  } catch (error) {
    console.error("❌ RabbitMQ connection error:", error);
    throw error;
  }
}

export function sendToQueue(message) {
  if (!channel) {
    throw new Error("RabbitMQ channel not initialized");
  }
  channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
  console.log("📤 Sent:", message);
}
