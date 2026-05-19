import { prisma } from "@/lib/prisma";
import { productsListResponseSchema } from "@/types/api-schemas";

export async function readLocalCatalogSnapshot() {
  const rowsEnvelope = await prisma.product.findMany({
    include: {
      variants: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 500,
  });

  const payloadEnvelope = rowsEnvelope.map((persistedCatalogRow) => ({
    id: persistedCatalogRow.id,
    name: persistedCatalogRow.name,
    price: persistedCatalogRow.price,
    stock: persistedCatalogRow.stock,
    sku: persistedCatalogRow.sku ?? null,
    type: persistedCatalogRow.type,
    image: persistedCatalogRow.image ?? null,
    lastUpdated: persistedCatalogRow.lastUpdated
      ? persistedCatalogRow.lastUpdated.toISOString()
      : null,
    variants: persistedCatalogRow.variants.map((variantEnvelope) => ({
      id: variantEnvelope.id,
      sku: variantEnvelope.sku ?? null,
      name: variantEnvelope.name,
      price: variantEnvelope.price,
      stock: variantEnvelope.stock,
      attributes: variantEnvelope.attributes ?? undefined,
    })),
  }));

  const normalizedEnvelope = productsListResponseSchema.parse({
    products: payloadEnvelope,
  });

  return normalizedEnvelope;
}
