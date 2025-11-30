const Ticket = require("../models/Ticket");

exports.createTicket = async (req, res) => {
  try {
    const ticket = await Ticket.create(req.body);
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
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
