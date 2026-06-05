const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tranId: { type: String, required: true, unique: true, index: true },
    valId: { type: String, trim: true, default: "", index: true },
    bankTranId: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "BDT" },
    status: {
      type: String,
      enum: ["initiated", "pending", "validated", "failed", "cancelled"],
      default: "initiated",
      index: true,
    },
    gatewayStatus: { type: String, trim: true, default: "" },
    cardType: { type: String, trim: true, default: "" },
    cardIssuer: { type: String, trim: true, default: "" },
    paymentMethod: { type: String, trim: true, default: "sslcommerz" },
    paymentDate: { type: Date },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date },
    rawInitiateResponse: { type: mongoose.Schema.Types.Mixed },
    rawValidationResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
