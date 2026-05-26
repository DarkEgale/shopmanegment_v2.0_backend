const ApiError = require("../../utils/apiError");
const Product = require("./product.model");

const tenantFilter = (userId, extra = {}) => ({ userId, isDeleted: false, ...extra });
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildFilter = (userId, query) => {
  const filter = tenantFilter(userId);
  if (query.search) {
    const regex = new RegExp(escapeRegExp(query.search), "i");
    filter.$or = [{ name: regex }, { sku: regex }, { category: regex }, { supplierName: regex }];
  }
  if (query.category) filter.category = query.category;
  if (query.supplierName) filter.supplierName = query.supplierName;
  if (query.stock === "out") filter.quantity = 0;
  if (query.stock === "available") filter.quantity = { $gt: 0 };
  if (query.stock === "low") filter.$expr = { $lte: ["$quantity", "$lowStockLimit"] };
  return filter;
};

const createProduct = async (userId, payload) => {
  try {
    return await Product.create({ ...payload, userId });
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, "SKU already exists");
    throw error;
  }
};

const getProducts = async (userId, query) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const skip = (page - 1) * limit;
  const filter = buildFilter(userId, query);
  const sort = query.sort || "-createdAt";

  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
};

const getProduct = async (userId, id) => {
  const product = await Product.findOne(tenantFilter(userId, { _id: id }));
  if (!product) throw new ApiError(404, "Product not found");
  return product;
};

const editableProductFields = [
  "name",
  "sku",
  "category",
  "supplierName",
  "buyingPrice",
  "sellingPrice",
  "quantity",
  "lowStockLimit",
];

const pickEditableProductFields = (payload) =>
  Object.fromEntries(editableProductFields.filter((field) => Object.prototype.hasOwnProperty.call(payload, field)).map((field) => [field, payload[field]]));

const updateProduct = async (userId, id, payload) => {
  try {
    const update = pickEditableProductFields(payload);
    const product = await Product.findOneAndUpdate(tenantFilter(userId, { _id: id }), { $set: update }, {
      new: true,
      runValidators: true,
    });
    if (!product) throw new ApiError(404, "Product not found");
    return product;
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, "SKU already exists");
    throw error;
  }
};

const deleteProduct = async (userId, id) => {
  const product = await Product.findOneAndUpdate(tenantFilter(userId, { _id: id }), { isDeleted: true }, { new: true });
  if (!product) throw new ApiError(404, "Product not found");
  return product;
};

module.exports = { createProduct, getProducts, getProduct, updateProduct, deleteProduct, tenantFilter };
