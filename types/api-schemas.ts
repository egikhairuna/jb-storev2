/**
 * Runtime Zod validators for cashier HTTP boundaries and mirrored Prisma payloads.
 */

import { SyncStatus as OrderPersistSyncStatus } from "@prisma/client";
import { z } from "zod";

export const cashierRoleSchema = z.enum(["CASHIER", "ADMIN"]);
export type CashierRole = z.infer<typeof cashierRoleSchema>;

/** Line items echoed by `/api/orders` payloads and mirrored into SQLite. */
export const orderItemsSchema = z.array(
  z.object({
    productId: z.string(),
    variationId: z.string().optional(),
    name: z.string(),
    sku: z.string().optional(),
    variantName: z.string().optional(),
    quantity: z.number().int().positive(),
    price: z.number().finite(),
  }),
);

export type OrderItemPayload = z.infer<typeof orderItemsSchema>[number];

export const createOrderRequestSchema = z.object({
  items: orderItemsSchema,
  discountAmount: z.number().finite().optional(),
  discountType: z.enum(['percent', 'nominal']).nullable().optional(),
  discountValue: z.number().finite().optional(),
  taxAmount: z.number().finite().optional(),
  paymentMethod: z.string().min(1),
  cashAmount: z.number().finite().optional(),
  transferAmount: z.number().finite().optional(),
  customerName: z.string().nullable().optional(),
  orderNote: z.string().nullable().optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

export const productVariantResponseSchema = z.object({
  id: z.string(),
  sku: z.string().nullable(),
  name: z.string(),
  price: z.number().finite(),
  stock: z.number().int(),
  attributes: z.unknown().optional(),
});

export const productApiResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().finite(),
  stock: z.number().int(),
  sku: z.string().nullable(),
  type: z.string(),
  image: z.string().nullable(),
  lastUpdated: z.string().nullable(),
  variants: z.array(productVariantResponseSchema),
});

export const productsListResponseSchema = z.object({
  products: z.array(productApiResponseSchema),
});

export type ProductApiResponse = z.infer<typeof productApiResponseSchema>;

export const stockLookupResponseSchema = z.object({
  productId: z.string(),
  variationId: z.string().optional(),
  stock: z.number().int(),
  sku: z.string().nullable(),
});

export const orderSummarySchema = z.object({
  id: z.string(),
  posOrderId: z.string(),
  wcOrderId: z.string().nullable(),
  cashierId: z.string(),
  subtotal: z.number().finite(),
  discountAmount: z.number().finite(),
  taxAmount: z.number().finite(),
  total: z.number().finite(),
  paymentMethod: z.string(),
  discountType: z.enum(['percent', 'nominal']).nullable().optional(),
  discountValue: z.number().finite().optional(),
  orderNote: z.string().nullable().optional(),
  cashAmount: z.number().nullable(),
  transferAmount: z.number().nullable(),
  customerName: z.string().nullable().optional(),
  syncStatus: z.nativeEnum(OrderPersistSyncStatus),
  retryCount: z.number().int(),
  errorMessage: z.string().nullable(),
  items: orderItemsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  cashierName: z.string().nullable().optional(),
});

export const ordersListResponseSchema = z.object({
  orders: z.array(orderSummarySchema),
});

export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const enqueueSyncResponseSchema = z.object({
  ok: z.literal(true),
  jobId: z.string().nullable(),
});

export const enqueueProductsSyncEnvelopeSchema = z.object({
  ok: z.literal(true),
  jobId: z.string().nullable(),
  snapshot: productsListResponseSchema,
});

export type EnqueueProductsSyncEnvelope = z.infer<
  typeof enqueueProductsSyncEnvelopeSchema
>;

export const enqueueOrdersSyncEnvelopeSchema = z.object({
  ok: z.literal(true),
  jobId: z.string().nullable(),
});

export type EnqueueOrdersSyncEnvelope = z.infer<
  typeof enqueueOrdersSyncEnvelopeSchema
>;

export const enqueueGenericResponseSchema = z.object({
  ok: z.literal(true),
  jobId: z.string().nullable(),
});

export const webhookAckSchema = z.object({
  received: z.literal(true),
});
