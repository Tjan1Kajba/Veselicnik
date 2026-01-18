const Draw = require("../models/Draw");
const Ticket = require("../models/Ticket");
const Prize = require("../models/Prize");

const { sendLog } = require("../logger/rabbitmq.js");

function pickPrize(prizes) {
  const rand = Math.random();
  let cumulative = 0;

  for (const prize of prizes) {
    cumulative += prize.probability;
    if (rand <= cumulative) return prize;
  }
  return null; // no prize
}

exports.getDraws = async (req, res) => {
  try {
    const draws = await Draw.find().sort({ date: -1 });

    // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

    res.json(draws);
  } catch (err) {
    console.error(err);

    // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    res.status(500).json({ error: "Internal server error" });
  }
};

exports.createDraw = async (req, res) => {
  try {
    const prizes = await Prize.find({ veselica_id: req.params.id_veselica });
    const tickets = await Ticket.find({ veselica_id: req.params.id_veselica });

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

    const draw = await Draw.create({ date: new Date(), winners, veselica_id: req.params.id_veselica });

    // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

    res.status(201).json(draw);

  } catch (err) {
    console.error(err);

    // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getWinners = async (req, res) => {
  const draw = await Draw.findById(req.params.id)
    .populate("winners.ticketId")
    .populate("winners.prizeId");

  if (!draw) {

    // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    return res.status(404).json({ error: "Draw not found" });
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


  res.json(draw.winners);
};

exports.deleteDraw = async (req, res) => {
  const deleted = await Draw.findByIdAndDelete(req.params.id);
  if (!deleted) {

    // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    return res.status(404).json({ error: "Draw not found" });
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

  res.status(204).send();
};
