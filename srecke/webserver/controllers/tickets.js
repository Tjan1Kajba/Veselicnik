const Ticket = require("../models/Ticket");
const axios = require("axios");

exports.createTicket = async (req, res) => {
  try {
    const ticket = await Ticket.create(req.body);
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.createTicketAndMusicRequest = async (req, res) => {
  const { userId, songName, artist } = req.body;

  if (!userId || !songName || !artist) {
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

    // Return combined response
    res.status(201).json({
      ticket,
      musicRequestResponse: response.data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getTickets = async (req, res) => {
  const tickets = await Ticket.find();
  res.json(tickets);
};

exports.updateTicket = async (req, res) => {
  try {
    const updated = await Ticket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Ticket not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteTicket = async (req, res) => {
  const deleted = await Ticket.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Ticket not found" });
  res.status(204).send();
};
