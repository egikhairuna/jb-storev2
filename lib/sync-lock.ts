import { prisma } from "@/lib/prisma";

const PRODUCT_LOCK_ID = "product-sync-global";
const ORDER_LOCK_ID = "order-sync-global";

async function upsertBaselineLock(lockId: string): Promise<void> {
  await prisma.syncLock.upsert({
    where: { id: lockId },
    create: {
      id: lockId,
      isLocked: false,
    },
    update: {},
  });
}

async function acquireLock(lockId: string): Promise<boolean> {
  await upsertBaselineLock(lockId);

  try {
    const updated = await prisma.syncLock.updateMany({
      where: { id: lockId, isLocked: false },
      data: {
        isLocked: true,
        lockedAt: new Date(),
        syncId: crypto.randomUUID(),
      },
    });
    return updated.count === 1;
  } catch {
    return false;
  }
}

async function releaseLock(lockId: string): Promise<void> {
  await prisma.syncLock.updateMany({
    where: { id: lockId },
    data: {
      isLocked: false,
      lockedAt: null,
    },
  });
}

export async function withProductSyncLock<TResult>(
  work: () => Promise<TResult>,
): Promise<{ ran: boolean; result?: TResult }> {
  const acquired = await acquireLock(PRODUCT_LOCK_ID);
  if (!acquired) {
    return { ran: false };
  }
  try {
    const result = await work();
    return { ran: true, result };
  } finally {
    await releaseLock(PRODUCT_LOCK_ID);
  }
}

export async function withOrderSyncLock<TResult>(
  work: () => Promise<TResult>,
): Promise<{ ran: boolean; result?: TResult }> {
  const acquired = await acquireLock(ORDER_LOCK_ID);
  if (!acquired) {
    return { ran: false };
  }
  try {
    const result = await work();
    return { ran: true, result };
  } finally {
    await releaseLock(ORDER_LOCK_ID);
  }
}

export async function recordProductLastSynced(timestamp: Date): Promise<void> {
  await prisma.syncLock.upsert({
    where: { id: PRODUCT_LOCK_ID },
    create: {
      id: PRODUCT_LOCK_ID,
      isLocked: false,
      lastSyncedAt: timestamp,
    },
    update: {
      lastSyncedAt: timestamp,
    },
  });
}

export async function recordOrdersLastSynced(timestamp: Date): Promise<void> {
  await prisma.syncLock.upsert({
    where: { id: ORDER_LOCK_ID },
    create: {
      id: ORDER_LOCK_ID,
      isLocked: false,
      lastSyncedAt: timestamp,
    },
    update: {
      lastSyncedAt: timestamp,
    },
  });
}

export async function getProductLastSyncedAt(): Promise<Date | null> {
  const row = await prisma.syncLock.findUnique({
    where: { id: PRODUCT_LOCK_ID },
    select: { lastSyncedAt: true },
  });
  const value = row?.lastSyncedAt;
  return value ?? null;
}

export async function getOrdersLastSyncedAt(): Promise<Date | null> {
  const row = await prisma.syncLock.findUnique({
    where: { id: ORDER_LOCK_ID },
    select: { lastSyncedAt: true },
  });
  const value = row?.lastSyncedAt;
  return value ?? null;
}
