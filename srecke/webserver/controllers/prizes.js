const Prize = require("../models/Prize");

const { sendLog } = require("../logger/rabbitmq.js");

exports.getPrizes = async (req, res) => {
  const prizes = await Prize.find();

  // Send log to RabbitMQ
  await sendLog(
    "INFO",
    req.originalUrl,
    req.method,
    true,
    "",
    req.correlationId
  );

  res.json(prizes);
};

exports.createPrize = async (req, res) => {
  try {
    const prize = await Prize.create(req.body);

    // Send log to RabbitMQ
    await sendLog(
      "INFO",
      req.originalUrl,
      req.method,
      true,
      "",
      req.correlationId
    );

    res.status(201).json(prize);
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

exports.updatePrize = async (req, res) => {
  try {
    const updated = await Prize.findByIdAndUpdate(
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


      return res.status(404).json({ error: "Prize not found" });
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

exports.deletePrize = async (req, res) => {
  const deleted = await Prize.findByIdAndDelete(req.params.id);

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

    return res.status(404).json({ error: "Prize not found" });
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
