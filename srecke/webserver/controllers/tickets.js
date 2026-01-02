const Ticket = require("../models/Ticket");
const axios = require("axios");

const { sendLog } = require("../logger/rabbitmq.js");

exports.createTicket = async (req, res) => {
  try {
    const ticket = await Ticket.create(req.body);
    // throw new Error("Simulated failure");

    // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

    res.status(201).json(ticket);
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
    res.status(400).json({ error: err.message });
  }
};

exports.createTicketAndMusicRequest = async (req, res) => {
  const { userId, songName, artist } = req.body;

  if (!userId || !songName || !artist) {

    // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      false,
      "",
      req.correlationId
    );

    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Create a new ticket
    const ticket = await Ticket.create({ userId });

    // Send POST request to music service
    const musicRequest = {
      user_id: userId,
      song_name: songName,
      artist,
      votes: 0,
      timestamp: new Date().toISOString(),
    };

    const response = await axios.post("http://music-service:8000/music/requests", musicRequest);


    // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

    // Return combined response
    res.status(201).json({
      ticket,
      musicRequestResponse: response.data,
    });
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

exports.getTickets = async (req, res) => {
  const tickets = await Ticket.find();

  // Send log to RabbitMQ
  await sendLog(
    "INFO",
    req.originalUrl,
    req.method,
    true,
    "",
    req.correlationId
  );

  res.json(tickets);
};

exports.updateTicket = async (req, res) => {
  try {
    const updated = await Ticket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) {

      // Send log to RabbitMQ
      await sendLog(
        "INFO",
        req.originalUrl,
        req.method,
        false,
        "",
        req.correlationId
      );
      return res.status(404).json({ error: "Ticket not found" });
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

    res.json(updated);
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

    res.status(400).json({ error: err.message });
  }
};

exports.deleteTicket = async (req, res) => {
  const deleted = await Ticket.findByIdAndDelete(req.params.id);

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

    return res.status(404).json({ error: "Ticket not found" });
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
