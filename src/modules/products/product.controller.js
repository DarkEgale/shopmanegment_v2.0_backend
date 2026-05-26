const asyncHandler = require("../../utils/asyncHandler");
const sendResponse = require("../../utils/apiResponse");
const service = require("./product.service");

const createProduct = asyncHandler(async (req, res) => {
  const product = await service.createProduct(req.user.id, req.validated.body);
  sendResponse(res, 201, "Product created", { product });
});

const getProducts = asyncHandler(async (req, res) => {
  const result = await service.getProducts(req.user.id, req.validated.query);
  sendResponse(res, 200, "Products loaded", { products: result.items }, result.meta);
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await service.getProduct(req.user.id, req.validated.params.id);
  sendResponse(res, 200, "Product loaded", { product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await service.updateProduct(req.user.id, req.validated.params.id, req.validated.body);
  sendResponse(res, 200, "Product updated", { product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  await service.deleteProduct(req.user.id, req.validated.params.id);
  sendResponse(res, 200, "Product deleted");
});

module.exports = { createProduct, getProducts, getProduct, updateProduct, deleteProduct };
