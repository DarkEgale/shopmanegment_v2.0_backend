const router = require("express").Router();
const protect = require("../../middleware/auth.middleware");
const controller = require("./statistics.controller");

router.get("/", protect, controller.getStatistics);

module.exports = router;
