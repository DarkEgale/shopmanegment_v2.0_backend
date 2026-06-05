const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, trim: true, default: "Walk-in Customer" },
    customerPhone: { type: String, trim: true, default: "" },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0, default: 0 },
    dueAmount: { type: Number, required: true, min: 0, default: 0, index: true },
    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "paid",
      index: true,
    },
    totalProfit: { type: Number, required: true },
    discount: { type: Number, default: 0, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile_banking", "bank_transfer"],
      default: "cash",
    },
    address: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    soldBy: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

saleSchema.index({ userId: 1, createdAt: -1 });
saleSchema.index({ userId: 1, dueAmount: 1, createdAt: -1 });
saleSchema.index({ userId: 1, paymentStatus: 1, createdAt: -1 });
saleSchema.index({ userId: 1, customerName: 1 });
saleSchema.index({ userId: 1, customerName: 1, customerPhone: 1 });

module.exports = mongoose.model("Sale", saleSchema);
