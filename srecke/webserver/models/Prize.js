const mongoose = require("mongoose");

const PrizeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  veselica_id: { type: String, required: true },
  probability: { type: Number, required: true }, // 0.1 = 10%
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Prize", PrizeSchema);
