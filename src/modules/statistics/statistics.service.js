const mongoose = require("mongoose");
const Product = require("../products/product.model");
const Sale = require("../sales/sale.model");
const SaleItem = require("../sales/saleItem.model");

const objectId = (id) => new mongoose.Types.ObjectId(id);

const groupSalesByDate = (userId, format, startDate = null) => {
  const match = { userId: objectId(userId) };
  if (startDate) match.createdAt = { $gte: startDate };
  return Sale.aggregate([
    { $match: match },
    { $lookup: { from: "saleitems", localField: "_id", foreignField: "saleId", as: "items" } },
    { $addFields: { grossProfit: { $sum: "$items.profit" } } },
    {
      $group: {
        _id: { $dateToString: { format, date: "$createdAt" } },
        sales: { $sum: "$totalAmount" },
        profit: { $sum: { $subtract: ["$grossProfit", { $ifNull: ["$discount", 0] }] } },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

const getStatistics = async (userId) => {
  const uid = objectId(userId);
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    dailySales,
    weeklySales,
    monthlySales,
    yearlySales,
    stockSummary,
    lowStockProducts,
    outOfStockProducts,
    actualSalesProfit,
    topSellingProducts,
    leastSellingProducts,
    soldProductProfits,
    topSuppliers,
    totalSoldProducts,
  ] = await Promise.all([
    groupSalesByDate(userId, "%Y-%m-%d", dayStart),
    groupSalesByDate(userId, "%Y-%m-%d", weekStart),
    groupSalesByDate(userId, "%Y-%m", monthStart),
    groupSalesByDate(userId, "%Y", yearStart),
    Product.aggregate([
      { $match: { userId: uid, isDeleted: false } },
      {
        $group: {
          _id: null,
          currentStock: { $sum: "$quantity" },
          totalStockBuyingValue: { $sum: { $multiply: ["$quantity", "$buyingPrice"] } },
          totalStockSellingValue: { $sum: { $multiply: ["$quantity", "$sellingPrice"] } },
          products: { $sum: 1 },
        },
      },
    ]),
    Product.find({ userId, isDeleted: false, $expr: { $and: [{ $lte: ["$quantity", "$lowStockLimit"] }, { $gt: ["$quantity", 0] }] } })
      .sort("quantity")
      .limit(10),
    Product.find({ userId, isDeleted: false, quantity: 0 }).sort("-updatedAt").limit(10),
    Sale.aggregate([
      { $match: { userId: uid } },
      { $lookup: { from: "saleitems", localField: "_id", foreignField: "saleId", as: "items" } },
      { $addFields: { grossProfit: { $sum: "$items.profit" } } },
      {
        $group: {
          _id: null,
          actualSalesProfit: { $sum: { $subtract: ["$grossProfit", { $ifNull: ["$discount", 0] }] } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
    ]),
    SaleItem.aggregate([
      { $match: { userId: uid } },
      { $group: { _id: { productId: "$productId", name: "$productName", sku: "$productSku" }, quantity: { $sum: "$quantity" }, revenue: { $sum: "$subtotal" }, profit: { $sum: "$profit" } } },
      { $sort: { quantity: -1 } },
      { $limit: 8 },
      { $lookup: { from: "products", localField: "_id.productId", foreignField: "_id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $project: { _id: "$_id.productId", name: { $ifNull: ["$_id.name", "$product.name"] }, sku: { $ifNull: ["$_id.sku", "$product.sku"] }, quantity: 1, revenue: 1, profit: 1 } },
    ]),
    SaleItem.aggregate([
      { $match: { userId: uid } },
      { $group: { _id: { productId: "$productId", name: "$productName", sku: "$productSku" }, quantity: { $sum: "$quantity" }, revenue: { $sum: "$subtotal" } } },
      { $sort: { quantity: 1 } },
      { $limit: 8 },
      { $lookup: { from: "products", localField: "_id.productId", foreignField: "_id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $project: { _id: "$_id.productId", name: { $ifNull: ["$_id.name", "$product.name"] }, sku: { $ifNull: ["$_id.sku", "$product.sku"] }, quantity: 1, revenue: 1 } },
    ]),
    SaleItem.aggregate([
      { $match: { userId: uid } },
      {
        $group: {
          _id: { productId: "$productId", name: "$productName", sku: "$productSku" },
          quantity: { $sum: "$quantity" },
          revenue: { $sum: "$subtotal" },
          profit: { $sum: "$profit" },
        },
      },
      { $sort: { profit: -1 } },
      { $limit: 12 },
      { $lookup: { from: "products", localField: "_id.productId", foreignField: "_id", as: "product" } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      { $project: { _id: "$_id.productId", name: { $ifNull: ["$_id.name", "$product.name"] }, sku: { $ifNull: ["$_id.sku", "$product.sku"] }, quantity: 1, revenue: 1, profit: 1 } },
    ]),
    Product.aggregate([
      { $match: { userId: uid, isDeleted: false } },
      { $group: { _id: "$supplierName", stock: { $sum: "$quantity" }, buyingValue: { $sum: { $multiply: ["$quantity", "$buyingPrice"] } }, products: { $sum: 1 } } },
      { $sort: { buyingValue: -1 } },
      { $limit: 8 },
    ]),
    SaleItem.aggregate([{ $match: { userId: uid } }, { $group: { _id: null, totalSoldProducts: { $sum: "$quantity" } } }]),
  ]);

  const stock = stockSummary[0] || {};
  const sales = actualSalesProfit[0] || {};
  const expectedStockProfit = (stock.totalStockSellingValue || 0) - (stock.totalStockBuyingValue || 0);

  return {
    dailySales,
    weeklySales,
    monthlySales,
    yearlySales,
    currentStock: stock.currentStock || 0,
    lowStockProducts,
    outOfStockProducts,
    totalStockBuyingValue: stock.totalStockBuyingValue || 0,
    totalStockSellingValue: stock.totalStockSellingValue || 0,
    expectedStockProfit,
    actualSalesProfit: sales.actualSalesProfit || 0,
    profitAndLoss: (sales.actualSalesProfit || 0) + expectedStockProfit,
    revenue: sales.revenue || 0,
    orders: sales.orders || 0,
    productCount: stock.products || 0,
    topSellingProducts,
    leastSellingProducts,
    soldProductProfits,
    topSuppliers,
    totalSoldProducts: totalSoldProducts[0]?.totalSoldProducts || 0,
  };
};

module.exports = { getStatistics };
