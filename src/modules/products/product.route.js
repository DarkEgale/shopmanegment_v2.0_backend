const router = require("express").Router();
const controller = require("./product.controller");
const protect = require("../../middleware/auth.middleware");
const validate = require("../../middleware/validate.middleware");
const validation = require("./product.validation");

router.use(protect);
router.get("/", validate(validation.listProductSchema), controller.getProducts);
router.post("/", validate(validation.createProductSchema), controller.createProduct);
router.get("/:id", validate(validation.idParamSchema), controller.getProduct);
router.put("/:id", validate(validation.updateProductSchema), controller.updateProduct);
router.delete("/:id", validate(validation.idParamSchema), controller.deleteProduct);

module.exports = router;
