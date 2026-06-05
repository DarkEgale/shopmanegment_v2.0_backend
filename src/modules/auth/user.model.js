const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    shopName: { type: String, required: true, trim: true },
    role: { type: String, enum: ["owner"], default: "owner" },
    registrationDate: { type: Date, default: Date.now, index: true },
    trialStartDate: { type: Date, default: Date.now },
    trialEndDate: { type: Date, required: true },
    subscriptionStatus: {
      type: String,
      enum: ["trialing", "active", "expired", "past_due", "cancelled"],
      default: "trialing",
      index: true,
    },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    paymentStatus: {
      type: String,
      enum: ["trial", "pending", "paid", "failed", "cancelled", "none"],
      default: "trial",
      index: true,
    },
    lastTransactionId: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
