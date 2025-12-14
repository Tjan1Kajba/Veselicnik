const Prize = require("../models/Prize");

exports.getPrizes = async (req, res) => {
  const prizes = await Prize.find();
  res.json(prizes);
};

exports.createPrize = async (req, res) => {
  try {
    const prize = await Prize.create(req.body);
    res.status(201).json(prize);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updatePrize = async (req, res) => {
  try {
    const updated = await Prize.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Prize not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deletePrize = async (req, res) => {
  const deleted = await Prize.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Prize not found" });
  res.status(204).send();
};
