function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (typeof raw !== "string" || raw.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

export const syncConfig = {
  productSyncEveryMs: readPositiveInt(
    process.env.PRODUCT_SYNC_INTERVAL_MS,
    5 * 60 * 1000,
  ),
  orderSyncEveryMs: readPositiveInt(
    process.env.ORDER_SYNC_INTERVAL_MS,
    2 * 60 * 1000,
  ),
  syncProductsConcurrency: readPositiveInt(
    process.env.SYNC_PRODUCTS_JOB_CONCURRENCY,
    1,
  ),
  syncOrdersConcurrency: readPositiveInt(
    process.env.SYNC_ORDERS_JOB_CONCURRENCY,
    2,
  ),
} as const;
