const router = require("express").Router();
const protect = require("../../middleware/auth.middleware");
const controller = require("./payment.controller");

router.post("/initiate", protect, controller.initiatePayment);
router.get("/history", protect, controller.history);
router.post("/success", controller.success);
router.get("/success", controller.success);
router.post("/fail", controller.fail);
router.get("/fail", controller.fail);
router.post("/cancel", controller.cancel);
router.get("/cancel", controller.cancel);
router.post("/ipn", controller.ipn);
router.get("/ipn", controller.ipn);

module.exports = router;
