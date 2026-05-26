const jwt = require("jsonwebtoken");
const env = require("../config/env");

const generateToken = (userId) =>
  jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

module.exports = generateToken;
