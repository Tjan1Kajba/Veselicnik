const express = require("express");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const dotenv = require("dotenv");

const axios = require("axios");

dotenv.config();

const app = express();
app.use(express.json());


const FOOD_SERVICE_URL = process.env.FOOD_SERVICE_URL || "http://food-service:8000/orders";

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PORT } = process.env;

const MONGO_URI = `mongodb://${DB_USER}:${DB_PASSWORD}@izgubljeni_predmeti_mongo:27017/${DB_NAME}?authSource=admin`;


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

// -----------------------------
// Mongoose Schema
// -----------------------------
const itemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["lost", "found"], required: true },
    name: String,
    description: String,
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);

// -----------------------------
// Swagger Setup
// -----------------------------
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Storitev izgubljenih predmetov API",
      version: "1.0.0",
      description: "API za prijavo izgubljenih in najdenih predmetov",
    },
  },
  apis: ["./app.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     Item:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [lost, found]
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         createdAt:
 *           type: string
 *         updatedAt:
 *           type: string
 */

/**
 * @swagger
 * tags:
 *   - name: Lost
 *   - name: Found
 */

// -----------------------------
// LOST
// -----------------------------

/**
 * @swagger
 * /lost:
 *   post:
 *     summary: Prijava izgubljenega predmeta
 *     tags:
 *       - Lost
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Denarnica"
 *               description:
 *                 type: string
 *                 example: "Črna usnjena denarnica"
 *     responses:
 *       201:
 *         description: Item created
 */
app.post("/lost", async (req, res) => {
  const item = await Item.create({ type: "lost", ...req.body });
  res.status(201).json(item);
});

/**
 * @swagger
 * /lost:
 *   get:
 *     summary: Vrne seznam vseh izgubljenih predmetov
 *     tags: [Lost]
 *     responses:
 *       200:
 *         description: List of lost items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Item'
 */
app.get("/lost", async (req, res) => {
  const items = await Item.find({ type: "lost" });
  res.json(items);
});

/**
 * @swagger
 * /lost/{id}:
 *   get:
 *     summary: Vrne podrobnosti o določenem izgubljenem predmetu
 *     tags: [Lost]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       404:
 *         description: Item not found
 */
app.get("/lost/:id", async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item || item.type !== "lost")
    return res.status(404).json({ message: "Predmet ne obstaja." });

  res.json(item);
});

/**
 * @swagger
 * /lost/{id}:
 *   put:
 *     summary: Posodobi podatke o izgubljenem predmetu
 *     tags: [Lost]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       404:
 *         description: Item not found
 */
app.put("/lost/:id", async (req, res) => {
  const item = await Item.findOneAndUpdate(
    { _id: req.params.id, type: "lost" },
    req.body,
    { new: true }
  );
  if (!item) return res.status(404).json({ message: "Predmet ne obstaja." });
  res.json(item);
});

/**
 * @swagger
 * /lost/{id}:
 *   delete:
 *     summary: Izbriše prijavo izgubljenega predmeta
 *     tags: [Lost]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Item deleted
 *       404:
 *         description: Item not found
 */
app.delete("/lost/:id", async (req, res) => {
  const result = await Item.findOneAndDelete({
    _id: req.params.id,
    type: "lost",
  });
  if (!result) return res.status(404).json({ message: "Predmet ne obstaja." });

  res.status(204).send();
});

// -----------------------------
// FOUND
// -----------------------------


/**
 * @swagger
 * /found:
 *   post:
 *     summary: Prijava najdenega predmeta in naročilo hrane
 *     tags: [Found]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, userId]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item created and food order sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 foundItem:
 *                   $ref: '#/components/schemas/Item'
 *                 foodOrderResponse:
 *                   type: object
 */
app.post("/found", async (req, res) => {
  const { name, description, userId } = req.body;

  try {
    // 1️⃣ Create the found item
    const foundItem = await Item.create({ type: "found", name, description });

    // 2️⃣ Create the food order
    const foodOrder = {
      user_id: userId,
      items: [
        { item_id: foundItem._id.toString(), quantity: 1 }
      ],
      status: "pending",
      paid: false
    };
  

    const foodResponse = await axios.post(FOOD_SERVICE_URL, foodOrder);

    // 3️⃣ Respond with both found item and food order
    res.status(201).json({
      foundItem,
      foodOrderResponse: foodResponse.data
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
app.listen(PORT || 9000, '0.0.0.0', () =>
  console.log(`🚀 Server running at http://localhost:${PORT || 9000}/docs`)
);

