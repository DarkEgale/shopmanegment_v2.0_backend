const asyncHandler = require("../../utils/asyncHandler");
const sendResponse = require("../../utils/apiResponse");
const env = require("../../config/env");
const service = require("./payment.service");

const redirectToFrontend = (res, path, tranId) => {
  const url = new URL(path, env.frontendUrl);
  if (tranId) url.searchParams.set("tran_id", tranId);
  return res.redirect(url.toString());
};

const initiatePayment = asyncHandler(async (req, res) => {
  const payment = await service.initiatePayment(req.user);
  sendResponse(res, 201, "Payment session created", { payment });
});

const success = asyncHandler(async (req, res) => {
  const payment = await service.verifyAndActivate({
    tranId: req.body.tran_id || req.query.tran_id,
    valId: req.body.val_id || req.query.val_id,
  });
  return redirectToFrontend(res, "/billing/success", payment.tranId);
});

const fail = asyncHandler(async (req, res) => {
  const payment = await service.markPaymentStatus({
    tranId: req.body.tran_id || req.query.tran_id,
    status: "failed",
    gatewayStatus: req.body.status || req.query.status,
  });
  return redirectToFrontend(res, "/billing/failed", payment.tranId);
});

const cancel = asyncHandler(async (req, res) => {
  const payment = await service.markPaymentStatus({
    tranId: req.body.tran_id || req.query.tran_id,
    status: "cancelled",
    gatewayStatus: req.body.status || req.query.status,
  });
  return redirectToFrontend(res, "/billing/cancelled", payment.tranId);
});

const ipn = asyncHandler(async (req, res) => {
  const tranId = req.body.tran_id || req.query.tran_id;
  const valId = req.body.val_id || req.query.val_id;
  if (tranId && valId) await service.verifyAndActivate({ tranId, valId });
  sendResponse(res, 200, "IPN processed");
});

const history = asyncHandler(async (req, res) => {
  const [payments, plan] = await Promise.all([
    service.getPaymentHistory(req.user.id),
    service.getSubscriptionPlan(),
  ]);
  sendResponse(res, 200, "Payment history loaded", { payments, plan });
});

module.exports = { initiatePayment, success, fail, cancel, ipn, history };
