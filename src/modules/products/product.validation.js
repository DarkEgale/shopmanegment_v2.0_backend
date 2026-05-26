const { z } = require("zod");

const productBody = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  supplierName: z.string().min(1),
  buyingPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0),
  lowStockLimit: z.coerce.number().int().min(0),
});

const createProductSchema = z.object({ body: productBody });
const updateProductSchema = z.object({ body: productBody.partial(), params: z.object({ id: z.string().min(1) }) });
const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });
const listProductSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    supplierName: z.string().optional(),
    stock: z.enum(["low", "out", "available"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort: z.string().optional(),
  }),
});

module.exports = { createProductSchema, updateProductSchema, idParamSchema, listProductSchema };
