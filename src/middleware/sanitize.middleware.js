const mongoSanitize = require("express-mongo-sanitize");

const sanitizeMongoPayload = (req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.query) mongoSanitize.sanitize(req.query);
  next();
};

module.exports = sanitizeMongoPayload;
