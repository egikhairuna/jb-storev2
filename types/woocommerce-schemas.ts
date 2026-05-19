import { z } from "zod";

import type {
  WCJsonValue,
  WCVariation,
  WCProduct,
  WCVariationAttribute,
} from "@/types/woocommerce";

const wcStockStatusLiteralSchema = z.enum([
  "instock",
  "outofstock",
  "onbackorder",
]);

const wcProductTypeLiteralSchema = z.enum(["simple", "variable"]);

export const wcJsonValueSchema: z.ZodType<WCJsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(wcJsonValueSchema),
    z.record(z.string(), wcJsonValueSchema),
  ]),
);

const wcVariationAttributeRawSchema = z.object({
  id: z.union([z.number(), z.null()]).optional(),
  name: z.string(),
  option: z.string(),
});

function normalizeVariationAttribute(
  snapshot: z.infer<typeof wcVariationAttributeRawSchema>,
): WCVariationAttribute {
  const numericId = snapshot.id;
  return {
    id: numericId ?? null,
    name: snapshot.name,
    option: snapshot.option,
  };
}

const wcCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  count: z.number().optional(),
});

export const wcProductSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    sku: z.string().nullable(),
    price: z.string(),
    regular_price: z
      .union([z.string(), z.null()])
      .optional()
      .transform((value) =>
        typeof value === "undefined" ? null : value,
      ),
    stock_quantity: z.union([z.number(), z.null()]),
    stock_status: wcStockStatusLiteralSchema,
    manage_stock: z.boolean(),
    type: wcProductTypeLiteralSchema,
    images: z
      .array(
        z.object({
          src: z.string(),
        }),
      )
      .optional()
      .default([]),
    variations: z
      .array(z.number())
      .optional()
      .default([]),
    categories: z
      .array(wcCategorySchema)
      .optional()
      .default([]),
    date_modified: z.string(),
  })
  .passthrough();

export const wcVariationSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    sku: z.string().nullable(),
    price: z.string(),
    stock_quantity: z.union([z.number(), z.null()]).optional(),
    stock_status: wcStockStatusLiteralSchema,
    manage_stock: z.boolean(),
    attributes: z.array(wcVariationAttributeRawSchema),
  })
  .passthrough();

/** Payload returned when WooCommerce creates or updates orders (subset validated for POS gateways). */
export const wcOrderUpsertEnvelopeSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    number: z.string().optional(),
    status: z.string().optional(),
    total: z.string().optional(),
    line_items: z.array(z.record(z.string(), wcJsonValueSchema)).optional(),
    date_created: z.string().optional(),
  })
  .passthrough();

export type WCOrderUpsertEnvelope = z.infer<typeof wcOrderUpsertEnvelopeSchema>;

export function parseKnownJsonWire(payload: unknown, label: string): unknown {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload) as unknown;
    } catch {
      throw new Error(`${label} is not valid JSON`);
    }
  }
  return payload;
}

export function parseWCVariationPayload(candidate: unknown): WCVariation {
  const parsedVariationRaw = wcVariationSchema.safeParse(candidate);
  if (!parsedVariationRaw.success) {
    throw new Error("Unexpected WooCommerce variation payload");
  }

  const record = parsedVariationRaw.data;
  const idSource = record.id;

  const normalizedVariationId =
    typeof idSource === "number" && Number.isFinite(idSource)
      ? idSource
      : Number.parseInt(`${idSource}`, 10);

  if (!Number.isFinite(normalizedVariationId)) {
    throw new Error("Variation payload lacked a numeric identifier");
  }

  const skuField = record.sku;
  const stockQuantityCandidate = record.stock_quantity;
  const normalizedStockQuantityRaw =
    typeof stockQuantityCandidate === "number" && Number.isFinite(stockQuantityCandidate)
      ? Math.trunc(stockQuantityCandidate)
      : null;

  return {
    id: normalizedVariationId,
    sku: typeof skuField === "string" || skuField === null ? skuField : null,
    price: record.price,
    stock_quantity: normalizedStockQuantityRaw,
    stock_status: record.stock_status,
    manage_stock: record.manage_stock,
    attributes: record.attributes.map((attributeCaptured) =>
      normalizeVariationAttribute(attributeCaptured),
    ),
  } satisfies WCVariation;
}

export function parseWCProductPayload(candidate: unknown): WCProduct {
  const parsedProductRawDescriptor = wcProductSchema.safeParse(candidate);
  if (!parsedProductRawDescriptor.success) {
    throw new Error("Unexpected WooCommerce product payload");
  }

  const payloadSnapshot = parsedProductRawDescriptor.data;
  const productSnapshot: WCProduct = {
    id: payloadSnapshot.id,
    name: payloadSnapshot.name,
    sku: payloadSnapshot.sku,
    price: payloadSnapshot.price,
    regular_price: payloadSnapshot.regular_price,
    stock_quantity: payloadSnapshot.stock_quantity,
    stock_status: payloadSnapshot.stock_status,
    manage_stock: payloadSnapshot.manage_stock,
    type: payloadSnapshot.type,
    images: [...payloadSnapshot.images.map((descriptor) =>
      ({
        src: descriptor.src,
      }),
    )],
    variations: [...payloadSnapshot.variations],
    categories: [...payloadSnapshot.categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      count: c.count
    }))],
    date_modified: payloadSnapshot.date_modified,
  };

  return productSnapshot;
}

