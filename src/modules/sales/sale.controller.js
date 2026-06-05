const asyncHandler = require("../../utils/asyncHandler");
const sendResponse = require("../../utils/apiResponse");
const service = require("./sale.service");

const createSale = asyncHandler(async (req, res) => {
  const result = await service.createSale(req.user, req.validated.body);
  sendResponse(res, 201, "Sale completed", result);
});

const updateSale = asyncHandler(async (req, res) => {
  const result = await service.updateSale(req.user, req.validated.params.id, req.validated.body);
  sendResponse(res, 200, "Sale updated", result);
});

const listSales = asyncHandler(async (req, res) => {
  const result = await service.listSales(req.user.id, req.validated.query);
  sendResponse(res, 200, "Sales loaded", { sales: result.items }, result.meta);
});

const getSale = asyncHandler(async (req, res) => {
  const result = await service.getSale(req.user.id, req.validated.params.id);
  sendResponse(res, 200, "Sale loaded", result);
});

const listUnpaidSales = asyncHandler(async (req, res) => {
  const sales = await service.listUnpaidSales(req.user.id, req.validated.query);
  sendResponse(res, 200, "Unpaid sales loaded", { sales });
});

const getUnpaidCustomerSummary = asyncHandler(async (req, res) => {
  const customers = await service.getUnpaidCustomerSummary(req.user.id, req.validated.query);
  sendResponse(res, 200, "Unpaid customers loaded", { customers });
});

module.exports = { createSale, updateSale, listSales, getSale, listUnpaidSales, getUnpaidCustomerSummary };
