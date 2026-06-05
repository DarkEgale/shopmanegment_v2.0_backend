const mongoose = require("mongoose");
const ApiError = require("../../utils/apiError");
const Product = require("../products/product.model");
const Sale = require("./sale.model");
const SaleItem = require("./saleItem.model");

const generateInvoiceNumber = () => `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizePhone = (value = "") => value.replace(/\D/g, "");

const buildSaleTotals = (payload, grossAmount, totalProfit) => {
  const discount = payload.discount || 0;
  const totalAmount = Math.max(grossAmount - discount, 0);
  const requestedStatus = payload.paymentStatus;
  const requestedPaidAmount = payload.paidAmount ?? (requestedStatus === "partial" ? 0 : totalAmount);
  const paidAmount =
    requestedStatus === "unpaid"
      ? 0
      : requestedStatus === "paid" && payload.paidAmount === undefined
        ? totalAmount
        : Math.min(requestedPaidAmount, totalAmount);
  const dueAmount = Math.max(totalAmount - paidAmount, 0);
  const paymentStatus = dueAmount === 0 ? "paid" : paidAmount === 0 ? "unpaid" : "partial";

  return { totalAmount, paidAmount, dueAmount, paymentStatus, totalProfit, discount };
};

const buildSaleItems = async (userId, productsPayload, session) => {
  const mergedProducts = Array.from(
    productsPayload.reduce((acc, item) => {
      const current = acc.get(item.productId) || { productId: item.productId, quantity: 0 };
      current.quantity += item.quantity;
      acc.set(item.productId, current);
      return acc;
    }, new Map()).values()
  );
  const productIds = mergedProducts.map((item) => item.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    userId,
    isDeleted: false,
  }).session(session);

  if (products.length !== productIds.length) throw new ApiError(404, "One or more products were not found");

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const saleItemsPayload = [];
  let grossAmount = 0;
  let totalProfit = 0;

  for (const item of mergedProducts) {
    const product = productMap.get(item.productId);
    if (product.quantity < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }

    const subtotal = product.sellingPrice * item.quantity;
    const profit = (product.sellingPrice - product.buyingPrice) * item.quantity;
    grossAmount += subtotal;
    totalProfit += profit;

    saleItemsPayload.push({
      productId: product._id,
      productName: product.name,
      productSku: product.sku,
      productCategory: product.category,
      quantity: item.quantity,
      buyingPrice: product.buyingPrice,
      sellingPrice: product.sellingPrice,
      subtotal,
      profit,
      userId,
    });

    product.quantity -= item.quantity;
    await product.save({ session });
  }

  return { saleItemsPayload, grossAmount, totalProfit };
};

const createSale = async (user, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { saleItemsPayload, grossAmount, totalProfit } = await buildSaleItems(user.id, payload.products, session);
    const totals = buildSaleTotals(payload, grossAmount, totalProfit);

    const [sale] = await Sale.create(
      [
        {
          invoiceNumber: generateInvoiceNumber(),
          customerName: payload.customerName || "Walk-in Customer",
          customerPhone: normalizePhone(payload.customerPhone || ""),
          ...totals,
          paymentMethod: payload.paymentMethod || "cash",
          address: payload.address || payload.note || "",
          soldBy: user.name,
          userId: user.id,
        },
      ],
      { session }
    );

    const saleItems = await SaleItem.insertMany(
      saleItemsPayload.map((item) => ({ ...item, saleId: sale._id })),
      { session }
    );

    await session.commitTransaction();
    return { sale, saleItems };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const updateSale = async (user, saleId, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sale = await Sale.findOne({ _id: saleId, userId: user.id }).session(session);
    if (!sale) throw new ApiError(404, "Sale not found");

    const oldItems = await SaleItem.find({ saleId: sale._id, userId: user.id }).session(session);
    for (const item of oldItems) {
      await Product.updateOne(
        { _id: item.productId, userId: user.id },
        { $inc: { quantity: item.quantity } },
        { session }
      );
    }

    const { saleItemsPayload, grossAmount, totalProfit } = await buildSaleItems(user.id, payload.products, session);
    const totals = buildSaleTotals(payload, grossAmount, totalProfit);

    sale.customerName = payload.customerName || "Walk-in Customer";
    sale.customerPhone = normalizePhone(payload.customerPhone || "");
    sale.totalAmount = totals.totalAmount;
    sale.paidAmount = totals.paidAmount;
    sale.dueAmount = totals.dueAmount;
    sale.paymentStatus = totals.paymentStatus;
    sale.totalProfit = totals.totalProfit;
    sale.discount = totals.discount;
    sale.paymentMethod = payload.paymentMethod || "cash";
    sale.address = payload.address || payload.note || "";
    sale.note = payload.note || "";
    await sale.save({ session });

    await SaleItem.deleteMany({ saleId: sale._id, userId: user.id }).session(session);
    const saleItems = await SaleItem.insertMany(
      saleItemsPayload.map((item) => ({ ...item, saleId: sale._id })),
      { session }
    );

    await session.commitTransaction();
    return { sale, saleItems };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const listSales = async (userId, query) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const skip = (page - 1) * limit;
  const filter = { userId };

  if (query.search) {
    const regex = new RegExp(escapeRegExp(query.search), "i");
    const matchingSaleIds = await SaleItem.distinct("saleId", {
      userId,
      $or: [{ productName: regex }, { productSku: regex }, { productCategory: regex }],
    });
    filter.$or = [{ invoiceNumber: regex }, { customerName: regex }, { customerPhone: regex }, { address: regex }, { soldBy: regex }, { _id: { $in: matchingSaleIds } }];
  }
  if (query.paymentMethod) filter.paymentMethod = query.paymentMethod;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = new Date(query.from);
    if (query.to) filter.createdAt.$lte = new Date(query.to);
  }

  const [items, total] = await Promise.all([
    Sale.find(filter).sort("-createdAt").skip(skip).limit(limit).lean(),
    Sale.countDocuments(filter),
  ]);

  return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
};

const getSale = async (userId, id) => {
  const sale = await Sale.findOne({ _id: id, userId }).lean();
  if (!sale) throw new ApiError(404, "Sale not found");
  const items = await SaleItem.find({ saleId: sale._id, userId }).lean();
  return { sale, items };
};

const listUnpaidSales = async (userId, query = {}) => {
  const filter = { userId, dueAmount: { $gt: 0 } };
  if (query.search) {
    const regex = new RegExp(escapeRegExp(query.search), "i");
    const matchingSaleIds = await SaleItem.distinct("saleId", {
      userId,
      $or: [{ productName: regex }, { productSku: regex }, { productCategory: regex }],
    });
    filter.$or = [{ invoiceNumber: regex }, { customerName: regex }, { customerPhone: regex }, { address: regex }, { soldBy: regex }, { _id: { $in: matchingSaleIds } }];
  }

  const sales = await Sale.find(filter).sort("-createdAt").lean();
  const saleIds = sales.map((sale) => sale._id);
  if (saleIds.length === 0) return [];

  const items = await SaleItem.find({ userId, saleId: { $in: saleIds } }).lean();
  const itemsBySale = items.reduce((acc, item) => {
    const key = item.saleId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return sales.map((sale) => ({ ...sale, items: itemsBySale[sale._id.toString()] || [] }));
};

const getUnpaidCustomerSummary = async (userId, query = {}) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const match = { userId: uid, dueAmount: { $gt: 0 } };
  if (query.search) {
    const regex = new RegExp(escapeRegExp(query.search), "i");
    match.$or = [{ customerName: regex }, { customerPhone: regex }];
  }

  return Sale.aggregate([
    { $match: match },
    {
      $addFields: {
        customerNameKey: { $toLower: { $trim: { input: { $ifNull: ["$customerName", "Walk-in Customer"] } } } },
        customerPhoneKey: { $ifNull: ["$customerPhone", ""] },
      },
    },
    {
      $group: {
        _id: { name: "$customerNameKey", phone: "$customerPhoneKey" },
        customerName: { $first: "$customerName" },
        customerPhone: { $first: "$customerPhone" },
        totalUnpaid: { $sum: "$dueAmount" },
        totalBilled: { $sum: "$totalAmount" },
        totalPaid: { $sum: "$paidAmount" },
        invoices: { $sum: 1 },
        lastSaleAt: { $max: "$createdAt" },
      },
    },
    { $sort: { totalUnpaid: -1 } },
  ]);
};

module.exports = { createSale, updateSale, listSales, getSale, listUnpaidSales, getUnpaidCustomerSummary };
