const express = require("express");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const apiRoutes = require("./routes/api");

require("dotenv").config();

const app = express();
app.use(express.json());

// Mongo
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PORT } = process.env;

const MONGO_URI = `mongodb://${DB_USER}:${DB_PASSWORD}@srecke_mongo:27017/${DB_NAME}?authSource=admin`;


async function connectWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log("✅ Connected to MongoDB");
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection failed, retrying in ${delay}ms...`, err.message);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  console.error("❌ Could not connect to MongoDB after multiple attempts. Exiting.");
  process.exit(1);
}


connectWithRetry();

// Swagger
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: { title: "Storitev srečk", version: "1.0.0" },
  },
  apis: ["./routes/*.js"],
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/", apiRoutes);

// Start
app.listen(PORT, () =>
  console.log(`Server running: http://localhost:${PORT}/docs`)
);
