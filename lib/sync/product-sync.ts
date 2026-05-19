import type { WCProduct, WCVariation } from "@/types/woocommerce";

import {
  getProductVariations,
  getProducts,
} from "@/lib/woocommerce";
import { prisma } from "@/lib/prisma";
import {
  getProductLastSyncedAt,
  recordProductLastSynced,
  withProductSyncLock,
} from "@/lib/sync-lock";

function getStockPriority(status: string): number {
  switch (status) {
    case "instock":
      return 2;
    case "onbackorder":
      return 1;
    case "outofstock":
      return 0;
    default:
      return 0;
  }
}

export function parseMoney(price: string): number {
  if (!price) return 0;
  const cleaned = price.replace(/[^0-9.\-]/g, "").trim();
  if (cleaned.length === 0) {
    return 0;
  }
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

export function coerceId(value: string | number): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}`;
  }
  return `${value}`;
}

function readModifiedDate(snapshot: WCProduct): Date | null {
  const localCandidate = snapshot.date_modified;

  if (typeof localCandidate === "string" && localCandidate.trim().length > 0) {
    const dateLocalSource = new Date(localCandidate.replace(" ", "T"));
    return Number.isNaN(dateLocalSource.getTime()) ? null : dateLocalSource;
  }

  return null;
}

async function synchronizeProductRecord(parsedProduct: WCProduct): Promise<void> {
  const id = coerceId(parsedProduct.id);
  const price = parseMoney(parsedProduct.price);

  const stockCandidate = parsedProduct.stock_quantity;
  const stockQuantity =
    typeof stockCandidate === "number" && Number.isFinite(stockCandidate)
      ? Math.trunc(stockCandidate)
      : 0;

  const skuCandidates = parsedProduct.sku;
  const normalizedSkuParent =
    typeof skuCandidates === "string" && skuCandidates.trim().length > 0
      ? skuCandidates.trim()
      : null;

  const primaryImageHref =
    parsedProduct.images.length > 0 ? parsedProduct.images[0]?.src : undefined;
  const normalizedImageSrc =
    typeof primaryImageHref === "string" && primaryImageHref.trim().length > 0
      ? primaryImageHref.trim()
      : null;

  const normalizedArchetype = parsedProduct.type;
  const modifier = readModifiedDate(parsedProduct);
  const categoryIds = JSON.stringify(parsedProduct.categories?.map(c => c.id) ?? []);

  let computedStock = stockQuantity;
  let variations: WCVariation[] = [];

  if (normalizedArchetype === "variable") {
    variations = await getProductVariations(id);
    computedStock = variations.reduce((sum, v) => {
      const vStock = v.stock_quantity;
      return sum + (typeof vStock === "number" && Number.isFinite(vStock) ? Math.trunc(vStock) : 0);
    }, 0);
  }

  const stockStatus = parsedProduct.stock_status || "instock";
  const stockPriority = getStockPriority(stockStatus);

  await prisma.product.upsert({
    where: { id },
    create: {
      id,
      name: parsedProduct.name,
      price,
      stock: normalizedArchetype === "variable" ? 0 : stockQuantity,
      computedStock,
      stockStatus,
      stockPriority,
      sku: normalizedSkuParent,
      type: normalizedArchetype,
      image: normalizedImageSrc,
      lastUpdated: modifier ?? null,
      categoryIds,
    },
    update: {
      name: parsedProduct.name,
      price,
      stock: normalizedArchetype === "variable" ? 0 : stockQuantity,
      computedStock,
      stockStatus,
      stockPriority,
      sku: normalizedSkuParent,
      type: normalizedArchetype,
      image: normalizedImageSrc,
      lastUpdated: modifier ?? null,
      categoryIds,
    },
  });

  if (normalizedArchetype === "variable") {
    await prisma.productVariant.deleteMany({
      where: { productId: id },
    });

    for (const variantHydratedFacet of variations) {
      const variantIdHydratedFacet = coerceId(variantHydratedFacet.id);
      const variationPriceParsed = parseMoney(variantHydratedFacet.price);

      const variationStockCandidateHydratedFacet = variantHydratedFacet.stock_quantity;
      const variationStockQuantityHydratedFacet =
        typeof variationStockCandidateHydratedFacet === "number" &&
        Number.isFinite(variationStockCandidateHydratedFacet)
          ? Math.trunc(variationStockCandidateHydratedFacet)
          : 0;

      const variantSkuCandidateHydratedFacet = variantHydratedFacet.sku;
      const variantSkuNormalizedHydratedFacet =
        typeof variantSkuCandidateHydratedFacet === "string" &&
        variantSkuCandidateHydratedFacet.trim().length > 0
          ? variantSkuCandidateHydratedFacet.trim()
          : null;

      const ribbonDescriptorHydratedCapturedFacet =
        variantHydratedFacet.attributes
          .map((attributeCapturedFacetHydratedRibbon: { option: string }) =>
            attributeCapturedFacetHydratedRibbon.option,
          )
          .join(" / ")
          .trim();

      await prisma.productVariant.create({
        data: {
          id: variantIdHydratedFacet,
          productId: id,
          sku: variantSkuNormalizedHydratedFacet,
          name:
            `${parsedProduct.name}${
              ribbonDescriptorHydratedCapturedFacet.length > 0
                ? ` — ${ribbonDescriptorHydratedCapturedFacet}`
                : ""
            }`.trim() ||
            `${parsedProduct.name} (${variantIdHydratedFacet})`.trim(),
          price: variationPriceParsed,
          stock: variationStockQuantityHydratedFacet,
          attributes:
            variantHydratedFacet.attributes.length > 0
              ? variantHydratedFacet.attributes.map((attributeCapturedFacetHydratedFacet: { id: number | null, name: string, option: string }) =>
                  ({
                    id: attributeCapturedFacetHydratedFacet.id,
                    name: attributeCapturedFacetHydratedFacet.name,
                    option: attributeCapturedFacetHydratedFacet.option,
                  }),
                )
              : undefined,
        },
      });
    }
  } else {
    await prisma.productVariant.deleteMany({
      where: { productId: id },
    });
  }
}

export async function runProductSyncIncremental(options?: {
  force?: boolean;
}): Promise<{
  skipped: boolean;
  processedProducts: number;
}> {
  const isForce = options?.force === true;
  const baseline = isForce ? null : await getProductLastSyncedAt();
  const captured = await withProductSyncLock(async () => {
    const perPage = 50;
    let pageCursor = 1;
    let totalPages = 1;
    let processed = 0;

    while (pageCursor <= totalPages) {
      console.info(`[SYNC] Fetching page ${pageCursor} of ${totalPages}...`);
      const snapshot = await getProducts({
        page: pageCursor,
        per_page: perPage,
        modifiedAfter:
          baseline != null ? new Date(baseline.getTime() + 1000) : undefined,
      });
      totalPages = snapshot.totalPages;

      const itemsHydratedCapturedFacet = snapshot.products;
      console.info(`[SYNC] Fetched ${itemsHydratedCapturedFacet.length} items from WooCommerce.`);
      
      for (const wooProductHydratedCapturedFacetPayload of itemsHydratedCapturedFacet) {
        await synchronizeProductRecord(wooProductHydratedCapturedFacetPayload);
      }
      processed += itemsHydratedCapturedFacet.length;

      pageCursor += 1;
    }

    await recordProductLastSynced(new Date());

    return { processed };
  });

  if (captured.ran !== true || typeof captured.result === "undefined") {
    return { skipped: true, processedProducts: 0 };
  }

  return {
    skipped: false,
    processedProducts: captured.result.processed,
  };
}
