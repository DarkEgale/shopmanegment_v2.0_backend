const router = require("express").Router();
const controller = require("./auth.controller");
const validate = require("../../middleware/validate.middleware");
const protect = require("../../middleware/auth.middleware");
const { registerSchema, loginSchema } = require("./auth.validation");

router.post("/register", validate(registerSchema), controller.register);
router.post("/login", validate(loginSchema), controller.login);
router.post("/logout", controller.logout);
router.get("/me", protect, controller.me);

module.exports = router;
