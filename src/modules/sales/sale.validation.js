const { z } = require("zod");

const createSaleSchema = z.object({
  body: z.object({
    customerName: z.string().optional(),
    discount: z.coerce.number().min(0).optional(),
    paidAmount: z.coerce.number().min(0).optional(),
    paymentStatus: z.enum(["paid", "partial", "unpaid"]).optional(),
    paymentMethod: z.enum(["cash", "card", "mobile_banking", "bank_transfer"]).optional(),
    address: z.string().optional(),
    note: z.string().optional(),
    products: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.coerce.number().int().min(1),
        })
      )
      .min(1),
  }),
});

const listSaleSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    paymentMethod: z.string().optional(),
    paymentStatus: z.enum(["paid", "partial", "unpaid"]).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const unpaidQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
  }),
});

const idParamSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

module.exports = { createSaleSchema, listSaleSchema, unpaidQuerySchema, idParamSchema };
