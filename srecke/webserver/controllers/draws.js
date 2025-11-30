const Draw = require("../models/Draw");
const Ticket = require("../models/Ticket");
const Prize = require("../models/Prize");

function pickPrize(prizes) {
  const rand = Math.random();
  let cumulative = 0;

  for (const prize of prizes) {
    cumulative += prize.probability;
    if (rand <= cumulative) return prize;
  }
  return null; // no prize
}

exports.createDraw = async (req, res) => {
  try {
    const tickets = await Ticket.find(); // all purchased tickets
    const prizes = await Prize.find();   // all available prizes

    const winners = [];

    // Simple random draw: one prize per ticket
    prizes.forEach(prize => {
      if (tickets.length === 0) return;
      const winnerIndex = Math.floor(Math.random() * tickets.length);
      winners.push({
        ticketId: tickets[winnerIndex]._id,
        userId: tickets[winnerIndex].userId,
        prizeId: prize._id,
      });
      tickets.splice(winnerIndex, 1); // remove chosen ticket
    });

    const draw = await Draw.create({ date: new Date(), winners });
    res.status(201).json(draw);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getWinners = async (req, res) => {
  const draw = await Draw.findById(req.params.id)
    .populate("winners.ticketId")
    .populate("winners.prizeId");

  if (!draw) return res.status(404).json({ error: "Draw not found" });

  res.json(draw.winners);
};

exports.deleteDraw = async (req, res) => {
  const deleted = await Draw.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Draw not found" });
  res.status(204).send();
};
