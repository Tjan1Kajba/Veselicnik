const { randomUUID } = require("crypto");

function correlationIdMiddleware(req, res, next) {
    let correlationId = req.headers["x-correlation-id"];

    if (!correlationId) {
        // doesn not exist create new
        correlationId = randomUUID();
    }

    // attach correlation to request
    req.correlationId = correlationId;

    // attach correlation to response
    res.setHeader("X-Correlation-ID", correlationId);

    next();
}

module.exports = correlationIdMiddleware;
