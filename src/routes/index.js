const router = require("express").Router();

router.get("/health", (req, res) => res.json({ success: true, message: "OK" }));
router.use("/auth", require("../modules/auth/auth.route"));
router.use("/products", require("../modules/products/product.route"));
router.use("/sales", require("../modules/sales/sale.route"));
router.use("/statistics", require("../modules/statistics/statistics.route"));

module.exports = router;
