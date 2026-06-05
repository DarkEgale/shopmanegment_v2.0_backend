const dotenv = require("dotenv");

dotenv.config();

const defaultClientUrls = [
  "https://inventshop.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || process.env.DATABASE || "mongodb://127.0.0.1:27017/inventory-saas",
  jwtSecret: process.env.JWT_SECRET || process.env.SECRET || "replace-this-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || process.env.EXP || "7d",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  backendUrl: process.env.BACKEND_URL || "http://localhost:5000",
  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID,
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
    isLive: String(process.env.SSLCOMMERZ_IS_LIVE || "false").toLowerCase() === "true",
  },
  subscription: {
    trialDays: Number(process.env.TRIAL_DAYS || 10),
    planAmount: Number(process.env.SUBSCRIPTION_AMOUNT || 499),
    planCurrency: process.env.SUBSCRIPTION_CURRENCY || "BDT",
    durationDays: Number(process.env.SUBSCRIPTION_DURATION_DAYS || 30),
  },
  clientUrls: [...new Set([
    ...defaultClientUrls,
    process.env.FRONTEND_URL,
    ...(process.env.CLIENT_URL || "").split(",").map((url) => url.trim()).filter(Boolean),
  ].filter(Boolean))],
};
