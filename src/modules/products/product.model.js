const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    supplierName: { type: String, required: true, trim: true },
    buyingPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockLimit: { type: Number, required: true, min: 0, default: 5 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ userId: 1, sku: 1 }, { unique: true });
productSchema.index({ userId: 1, name: "text", sku: "text", category: "text", supplierName: "text" });

module.exports = mongoose.model("Product", productSchema);
