const express = require("express");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const cors = require("cors");
const dotenv = require("dotenv");

const axios = require("axios");

const authenticateToken = require("./middleware/authMiddleware.js");
const { requireAdmin } = require("./middleware/roleMiddleware.js");

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://frontend_user:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://localhost:8001",
    "http://localhost:8002",
    "http://localhost:8003",
    "http://localhost:8004",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());


const FOOD_SERVICE_URL = process.env.FOOD_SERVICE_URL || "http://food-service:8000/orders";

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, PORT } = process.env;

const MONGO_URI = `mongodb://${DB_USER}:${DB_PASSWORD}@izgubljeni_predmeti_mongo:27017/${DB_NAME}?authSource=admin`;

const { sendLog } = require("./logger/rabbitmq.js");

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
    veselica_id: { type: String, required: true },
    type: { type: String, enum: ["lost", "found"], required: true },
    name: String,
    description: String,
    user_id: { type: String, required: true },
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", itemSchema);


const correlationIdMiddleware = require("./middleware/correlation.js");

app.use(correlationIdMiddleware);


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

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ["./app.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs",
  swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
 *     security:
 *       - bearerAuth: []
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
 *               veselica_id:
 *                 type: string
 *                 example: ""
 *     responses:
 *       201:
 *         description: Item created
 */
app.post("/lost",
  authenticateToken,
  async (req, res) => {

    try {
      const item = await Item.create({ type: "lost", user_id: req.user.id, ...req.body });

      // Send log to RabbitMQ
      await sendLog(
        "INFO",
        req.originalUrl,
        req.method,
        true,
        "",
        req.correlationId
      );

      res.status(201).json(item);

    } catch (err) {

      // Send log to RabbitMQ
      await sendLog(
        "INFO",
        req.originalUrl,
        req.method,
        false,
        "",
        req.correlationId
      );

      res.status(500).json({ error: err.message });
    }
  });

/**
 * @swagger
 * /lost:
 *   get:
 *     summary: Vrne seznam vseh izgubljenih predmetov
 *     tags: [Lost]
 *     security:
 *       - bearerAuth: []
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
app.get("/lost",
  authenticateToken,
  async (req, res) => {
  const items = await Item.find({ type: "lost" });

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

  res.json(items);
});

/**
 * @swagger
 * /lost/{id}:
 *   get:
 *     summary: Vrne podrobnosti o določenem izgubljenem predmetu
 *     tags: [Lost]
 *     security:
 *       - bearerAuth: []
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
app.get("/lost/:id",
  authenticateToken,
 async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item || item.type !== "lost") {
    
  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    return res.status(404).json({ message: "Predmet ne obstaja." });
  }

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );
    
  res.json(item);
});

/**
 * @swagger
 * /lost/{id}:
 *   put:
 *     summary: Posodobi podatke o izgubljenem predmetu
 *     tags: [Lost]
 *     security:
 *       - bearerAuth: []
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
app.put("/lost/:id",
  authenticateToken,
 async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item || item.type !== "lost") {

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    return res.status(404).json({ message: "Predmet ne obstaja." });
  }

  if (item.user_id !== req.user.id && req.user.userType !== "admin") {

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "Not authorized",
      req.correlationId
    );

    return res.status(403).json({ error: "Not authorized" });
  }

  const updatedItem = await Item.findOneAndUpdate(
    { _id: req.params.id, type: "lost" },
    req.body,
    { new: true }
  );

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

  res.json(updatedItem);
});

/**
 * @swagger
 * /lost/{id}:
 *   delete:
 *     summary: Izbriše prijavo izgubljenega predmeta
 *     tags: [Lost]
 *     security:
 *       - bearerAuth: []
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
app.delete("/lost/:id",
  authenticateToken,
 async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item || item.type !== "lost") {

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    return res.status(404).json({ message: "Predmet ne obstaja." });
  }

  if (item.user_id !== req.user.id && req.user.userType !== "admin") {

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "Not authorized",
      req.correlationId
    );

    return res.status(403).json({ error: "Not authorized" });
  }

  const result = await Item.findOneAndDelete({
    _id: req.params.id,
    type: "lost",
  });

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

  res.status(204).send();
});

// -----------------------------
// FOUND
// -----------------------------


/**
 * @swagger
 * /found:
 *   get:
 *     summary: Vrne seznam vseh najdenih predmetov
 *     tags: [Found]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of found items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Item'
 */
app.get("/found",
  authenticateToken,
  async (req, res) => {
  const items = await Item.find({ type: "found" });

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

  res.json(items);
});

/**
 * @swagger
 * /found/{id}:
 *   get:
 *     summary: Vrne podrobnosti o določenem najdenem predmetu
 *     tags: [Found]
 *     security:
 *       - bearerAuth: []
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
app.get("/found/:id",
  authenticateToken,
 async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item || item.type !== "found") {

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    return res.status(404).json({ message: "Predmet ne obstaja." });
  }

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

  res.json(item);
});

/**
 * @swagger
 * /found/{id}:
 *   delete:
 *     summary: Izbris najdenega predmeta
 *     tags: [Found]
 *     security:
 *       - bearerAuth: []
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
 *             required: [name, description, userId]
 *     responses:
 *       201:
 *         description: Item deleted
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
app.delete(
  "/found/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const item = await Item.findById(id);
      if (!item || item.type !== "found") {

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

        return res.status(404).json({ error: "Found item not found" });
      }

      if (item.user_id !== req.user.id && req.user.userType !== "admin") {

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "Not authorized",
      req.correlationId
    );

        return res.status(403).json({ error: "Not authorized" });
      }

      const deletedItem = await Item.findOneAndDelete({
        _id: id,
        type: "found",
      });

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

      res.json({
        message: "Found item deleted",
        deletedItem,
      });
    } catch (err) {
      console.error(err.message);

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * @swagger
 * /found/{id}:
 *   put:
 *     summary: Posodobi najden predmet
 *     tags: [Found]
 *     security:
 *       - bearerAuth: []
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
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Found item updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
app.put(
  "/found/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, veselica_id } = req.body;

      // Basic validation
      if (!name || !description) {

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

        return res.status(400).json({
          error: "name and description are required",
        });
      }

      const item = await Item.findById(id);
      if (!item || item.type !== "found") {

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

        return res.status(404).json({ error: "Found item not found" });
      }

      if (item.user_id !== req.user.id && req.user.userType !== "admin") {

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "Not authorized",
      req.correlationId
    );

        return res.status(403).json({ error: "Not authorized" });
      }

      const updatedItem = await Item.findOneAndUpdate(
  { _id: id, type: "found" },
  { name, description, veselica_id },
  { new: true, runValidators: true }
);


  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

      res.json({
        message: "Found item updated",
        updatedItem,
      });
    } catch (err) {
      console.error(err.message);

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

      res.status(500).json({ error: err.message });
    }
  }
);



/**
 * @swagger
 * /found:
 *   post:
 *     summary: Prijava najdenega predmeta
 *     tags: [Found]
 *     security:
 *       - bearerAuth: []
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
 *               veselica_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item created
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
app.post("/found",
  authenticateToken,
 async (req, res) => {
  const { name, description, userId, veselica_id } = req.body;

  try {
    const foundItem = await Item.create({ type: "found", name, description, user_id: req.user.id, veselica_id });

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

    res.status(201).json({
      foundItem,
    });

  } catch (err) {
    console.error(err.message);

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /foundAndOrderFood:
 *   post:
 *     summary: Prijava najdenega predmeta in naročilo hrane
 *     tags: [Found]
 *     security:
 *       - bearerAuth: []
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
 *               veselica_id:
 *                 type: string
 *               food_name:
 *                 type: string
 *                 example: "pica"
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
app.post("/foundAndOrderFood",
  authenticateToken,
 async (req, res) => {
  const { name, description, userId, veselica_id, food_name } = req.body;

  try {
    // create the found item
    const foundItem = await Item.create({ type: "found", name, description, user_id: req.user.id, veselica_id });

    let foodOrderResponse = null;
    try {
      // create the food order (automatically paid since it's a gift)
      const foodOrder = {
        user_id: userId,
        items: [
          { item_id: food_name, quantity: 1 }
        ],
        status: "Darilo",
        paid: true
      };

      const correlationId = req.correlationId || req.headers['x-correlation-id'] || req.headers['X-Correlation-ID'];
      const foodHeaders = { 'Authorization': req.headers.authorization };
      if (correlationId) foodHeaders['X-Correlation-ID'] = correlationId;

      const foodResponse = await axios.post(FOOD_SERVICE_URL, foodOrder, {
        headers: foodHeaders
      });
      foodOrderResponse = foodResponse.data;
    } catch (foodErr) {
      console.error("Food order creation failed, but item was created:", foodErr.message);
      // Log the error but don't fail the request since the item was created
    }

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

    // respond with found item and food order (if successful)
    res.status(201).json({
      foundItem,
      foodOrderResponse
    });

  } catch (err) {
    console.error(err.message);

  // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
app.listen(PORT || 9000, '0.0.0.0', () =>
  console.log(`🚀 Server running at http://localhost:${PORT || 9000}/docs`)
);
