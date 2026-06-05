const ApiError = require("../utils/apiError");
const { getSubscriptionAccess } = require("../modules/auth/auth.service");

const requirePremium = async (req, res, next) => {
  try {
    const access = getSubscriptionAccess(req.user);
    if (access.hasPremiumAccess) return next();

    if (req.user.subscriptionStatus === "trialing") {
      req.user.subscriptionStatus = "expired";
      req.user.paymentStatus = req.user.paymentStatus === "paid" ? "paid" : "none";
      await req.user.save();
    }

    throw new ApiError(402, "Subscription required", {
      code: "SUBSCRIPTION_REQUIRED",
      reason: access.restrictionReason,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = requirePremium;
