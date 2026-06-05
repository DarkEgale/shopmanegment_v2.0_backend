const bcrypt = require("bcrypt");
const ApiError = require("../../utils/apiError");
const env = require("../../config/env");
const User = require("./user.model");

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const getSubscriptionAccess = (user) => {
  const now = new Date();
  const trialEndDate = user.trialEndDate ? new Date(user.trialEndDate) : null;
  const subscriptionEndDate = user.subscriptionEndDate ? new Date(user.subscriptionEndDate) : null;
  const isTrialActive = user.subscriptionStatus === "trialing" && trialEndDate && trialEndDate >= now;
  const isSubscriptionActive = user.subscriptionStatus === "active" && subscriptionEndDate && subscriptionEndDate >= now;

  return {
    hasPremiumAccess: Boolean(isTrialActive || isSubscriptionActive),
    isTrialActive: Boolean(isTrialActive),
    remainingTrialDays: isTrialActive ? Math.max(Math.ceil((trialEndDate - now) / (24 * 60 * 60 * 1000)), 0) : 0,
    restrictionReason: isTrialActive || isSubscriptionActive ? null : "Your free trial has ended. Upgrade to continue using premium features.",
  };
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  shopName: user.shopName,
  role: user.role,
  registrationDate: user.registrationDate,
  trialStartDate: user.trialStartDate,
  trialEndDate: user.trialEndDate,
  subscriptionStatus: user.subscriptionStatus,
  subscriptionStartDate: user.subscriptionStartDate,
  subscriptionEndDate: user.subscriptionEndDate,
  paymentStatus: user.paymentStatus,
  lastTransactionId: user.lastTransactionId,
  subscription: getSubscriptionAccess(user),
  createdAt: user.createdAt,
});

const register = async (payload) => {
  const exists = await User.exists({ email: payload.email });
  if (exists) throw new ApiError(409, "Email already registered");

  const hashedPassword = await bcrypt.hash(payload.password, 12);
  const registrationDate = new Date();
  const user = await User.create({
    ...payload,
    password: hashedPassword,
    registrationDate,
    trialStartDate: registrationDate,
    trialEndDate: addDays(registrationDate, env.subscription.trialDays),
    subscriptionStatus: "trialing",
    paymentStatus: "trial",
  });
  return publicUser(user);
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new ApiError(401, "Invalid email or password");

  return publicUser(user);
};

module.exports = { register, login, publicUser, getSubscriptionAccess };
