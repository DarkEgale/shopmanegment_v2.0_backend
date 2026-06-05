const crypto = require("crypto");
const ApiError = require("../../utils/apiError");
const env = require("../../config/env");
const User = require("../auth/user.model");
const Payment = require("./payment.model");

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const getSslEndpoints = () => {
  const host = env.sslcommerz.isLive ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
  return {
    init: `${host}/gwprocess/v4/api.php`,
    validate: `${host}/validator/api/validationserverAPI.php`,
  };
};

const assertConfigured = () => {
  if (!env.sslcommerz.storeId || !env.sslcommerz.storePassword) {
    throw new ApiError(500, "SSLCommerz credentials are not configured");
  }
};

const makeTransactionId = (userId) => {
  const suffix = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `SUB-${String(userId).slice(-6).toUpperCase()}-${Date.now()}-${suffix}`;
};

const getSubscriptionPlan = () => ({
  amount: env.subscription.planAmount,
  currency: env.subscription.planCurrency,
  durationDays: env.subscription.durationDays,
});

const createInitiatePayload = ({ user, payment, plan }) => ({
  store_id: env.sslcommerz.storeId,
  store_passwd: env.sslcommerz.storePassword,
  total_amount: plan.amount,
  currency: plan.currency,
  tran_id: payment.tranId,
  success_url: `${env.backendUrl}/api/v1/payments/success`,
  fail_url: `${env.backendUrl}/api/v1/payments/fail`,
  cancel_url: `${env.backendUrl}/api/v1/payments/cancel`,
  ipn_url: `${env.backendUrl}/api/v1/payments/ipn`,
  product_name: "Inventory SaaS Subscription",
  product_category: "subscription",
  product_profile: "general",
  cus_name: user.name,
  cus_email: user.email,
  cus_add1: user.shopName,
  cus_city: "Dhaka",
  cus_country: "Bangladesh",
  cus_phone: "01700000000",
  shipping_method: "NO",
  num_of_item: 1,
  value_a: String(user._id),
  value_b: "subscription",
  multi_card_name: "bkash",
});

const postForm = async (url, payload) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(Object.entries(payload).map(([key, value]) => [key, String(value)])),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new ApiError(502, "Unable to initiate SSLCommerz payment");
  return data;
};

const initiatePayment = async (user) => {
  assertConfigured();
  const plan = getSubscriptionPlan();
  if (!plan.amount || plan.amount <= 0) throw new ApiError(500, "Subscription amount is not configured");

  const payment = await Payment.create({
    userId: user._id,
    tranId: makeTransactionId(user._id),
    amount: plan.amount,
    currency: plan.currency,
    status: "initiated",
  });

  const data = await postForm(getSslEndpoints().init, createInitiatePayload({ user, payment, plan }));
  payment.rawInitiateResponse = data;
  await payment.save();

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    payment.status = "failed";
    payment.gatewayStatus = data.status || "INIT_FAILED";
    await payment.save();
    throw new ApiError(502, data.failedreason || "SSLCommerz did not return a payment URL");
  }

  user.paymentStatus = "pending";
  user.lastTransactionId = payment.tranId;
  await user.save();

  return {
    transactionId: payment.tranId,
    amount: payment.amount,
    currency: payment.currency,
    gatewayUrl: data.GatewayPageURL,
  };
};

const validateWithSslcommerz = async (valId) => {
  assertConfigured();
  const url = new URL(getSslEndpoints().validate);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", env.sslcommerz.storeId);
  url.searchParams.set("store_passwd", env.sslcommerz.storePassword);
  url.searchParams.set("v", "1");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new ApiError(502, "Unable to verify SSLCommerz transaction");
  return data;
};

const activateSubscription = async ({ payment, validation }) => {
  if (payment.status === "validated") return payment;

  const validatedAmount = Number(validation.amount);
  if (!["VALID", "VALIDATED"].includes(validation.status)) throw new ApiError(400, "Payment is not valid");
  if (validation.tran_id !== payment.tranId) throw new ApiError(400, "Transaction mismatch");
  if (Math.abs(validatedAmount - payment.amount) > 0.01) throw new ApiError(400, "Payment amount mismatch");
  if (validation.currency !== payment.currency) throw new ApiError(400, "Payment currency mismatch");

  const user = await User.findById(payment.userId);
  if (!user) throw new ApiError(404, "Payment user not found");

  const now = new Date();
  const currentEnd = user.subscriptionEndDate && user.subscriptionEndDate > now ? user.subscriptionEndDate : now;
  const subscriptionEndDate = addDays(currentEnd, env.subscription.durationDays);

  payment.status = "validated";
  payment.gatewayStatus = validation.status;
  payment.valId = validation.val_id || payment.valId;
  payment.bankTranId = validation.bank_tran_id || "";
  payment.cardType = validation.card_type || "";
  payment.cardIssuer = validation.card_issuer || "";
  payment.paymentDate = now;
  payment.subscriptionStartDate = currentEnd;
  payment.subscriptionEndDate = subscriptionEndDate;
  payment.rawValidationResponse = validation;
  await payment.save();

  user.subscriptionStatus = "active";
  user.subscriptionStartDate = currentEnd;
  user.subscriptionEndDate = subscriptionEndDate;
  user.paymentStatus = "paid";
  user.lastTransactionId = payment.tranId;
  await user.save();

  return payment;
};

const verifyAndActivate = async ({ tranId, valId }) => {
  if (!tranId || !valId) throw new ApiError(400, "Missing payment verification data");

  const payment = await Payment.findOne({ tranId });
  if (!payment) throw new ApiError(404, "Payment transaction not found");
  if (payment.status === "validated") return payment;

  const validation = await validateWithSslcommerz(valId);
  return activateSubscription({ payment, validation });
};

const markPaymentStatus = async ({ tranId, status, gatewayStatus }) => {
  if (!tranId) throw new ApiError(400, "Missing transaction ID");
  const payment = await Payment.findOne({ tranId });
  if (!payment) throw new ApiError(404, "Payment transaction not found");
  if (payment.status !== "validated") {
    payment.status = status;
    payment.gatewayStatus = gatewayStatus || status.toUpperCase();
    await payment.save();
    await User.updateOne(
      { _id: payment.userId, lastTransactionId: tranId },
      { $set: { paymentStatus: status === "cancelled" ? "cancelled" : "failed" } }
    );
  }
  return payment;
};

const getPaymentHistory = async (userId) => Payment.find({ userId }).sort("-createdAt").limit(20).lean();

module.exports = {
  initiatePayment,
  verifyAndActivate,
  markPaymentStatus,
  getPaymentHistory,
  getSubscriptionPlan,
};
