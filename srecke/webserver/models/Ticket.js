const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  drawId: { type: mongoose.Schema.Types.ObjectId, ref: "Draw", default: null },
  prizeId: { type: mongoose.Schema.Types.ObjectId, ref: "Prize", default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Ticket", TicketSchema);
