const router = require("express").Router();
const controller = require("./sale.controller");
const protect = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate.middleware");
const validation = require("./sale.validation");

router.use(protect);
router.get("/", validate(validation.listSaleSchema), controller.listSales);
router.post("/", validate(validation.createSaleSchema), controller.createSale);
router.get("/unpaid", validate(validation.unpaidQuerySchema), controller.listUnpaidSales);
router.get("/unpaid/customers", validate(validation.unpaidQuerySchema), controller.getUnpaidCustomerSummary);
router.get("/:id", validate(validation.idParamSchema), controller.getSale);

module.exports = router;
