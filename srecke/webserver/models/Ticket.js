const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  veselica_id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Ticket", TicketSchema);
