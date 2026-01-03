const mongoose = require("mongoose");

const DrawSchema = new mongoose.Schema({
  veselica_id: { type: String, required: true },
  date: { type: Date, default: Date.now },
  winners: [
    {
      ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
      prizeId: { type: mongoose.Schema.Types.ObjectId, ref: "Prize" }
    }
  ]
});

module.exports = mongoose.model("Draw", DrawSchema);
