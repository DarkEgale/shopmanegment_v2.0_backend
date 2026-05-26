const mongoose = require("mongoose");

const saleItemSchema = new mongoose.Schema(
  {
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productName: { type: String, required: true, trim: true },
    productSku: { type: String, required: true, trim: true },
    productCategory: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    buyingPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    profit: { type: Number, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

saleItemSchema.index({ userId: 1, saleId: 1 });
saleItemSchema.index({ userId: 1, productName: 1 });
saleItemSchema.index({ userId: 1, productSku: 1 });

module.exports = mongoose.model("SaleItem", saleItemSchema);
