import { Queue } from "bullmq";
import type { RedisOptions } from "ioredis";
import IORedis from "ioredis";

export const SYNC_QUEUE_NAME = "woo-pos-sync-queue" as const;

export type SyncJobPayload =
  | { kind: "products"; force?: boolean }
  | { kind: "orders-all" }
  | { kind: "order-one"; orderId: string };

export const JOB_PRODUCTS = "JOB_PRODUCTS_FULL" as const;
export const JOB_ORDERS = "JOB_ORDERS_SWEEP" as const;

let redisSingleton: IORedis | null = null;
let queueSingleton: Queue<SyncJobPayload> | null = null;

function readRedisConnectionOptions(): RedisOptions {
  return {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 10000,
  };
}

function requireRedisConnectionUrl(): string {
  const redisUrlCandidate = process.env.REDIS_URL;
  if (
    typeof redisUrlCandidate !== "string" ||
    redisUrlCandidate.trim().length === 0
  ) {
    throw new Error("REDIS_URL is not configured.");
  }

  const trimmedRedisUrl = redisUrlCandidate.trim();
  if (
    !trimmedRedisUrl.startsWith("redis://") &&
    !trimmedRedisUrl.startsWith("rediss://")
  ) {
    throw new Error("REDIS_URL must start with redis:// or rediss://");
  }

  return trimmedRedisUrl;
}

export function acquireRedisSingleton(): IORedis {
  if (redisSingleton) {
    return redisSingleton;
  }
  const connectionUrlString = requireRedisConnectionUrl();
  const redisInstance = new IORedis(
    connectionUrlString,
    readRedisConnectionOptions(),
  );
  redisSingleton = redisInstance;
  return redisInstance;
}

export function acquireSyncQueue(): Queue<SyncJobPayload> {
  if (queueSingleton) {
    return queueSingleton;
  }
  const redisConnectionDriver = acquireRedisSingleton();
  const queueInstance = new Queue<SyncJobPayload>(SYNC_QUEUE_NAME, {
    connection: redisConnectionDriver,
    defaultJobOptions: {
      removeOnComplete: 100,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 4000,
      },
    },
  });
  queueSingleton = queueInstance;
  return queueInstance;
}

async function ensureRedisLinkReady(): Promise<void> {
  const redisDriver = acquireRedisSingleton();
  if (redisDriver.status === "wait" || redisDriver.status === "end") {
    await redisDriver.connect();
  }
}

export async function enqueueProductSync(options?: {
  delayMs?: number | undefined;
  force?: boolean;
}): Promise<{ jobId?: string | undefined }> {
  await ensureRedisLinkReady();
  const queueInstance = acquireSyncQueue();
  const queuedJob = await queueInstance.add(
    JOB_PRODUCTS,
    {
      kind: "products",
      force: options?.force,
    },
    typeof options?.delayMs === "number"
      ? { delay: options.delayMs > 0 ? options.delayMs : undefined }
      : undefined,
  );
  const identifier = queuedJob?.id == null ? undefined : `${queuedJob.id}`;
  return { jobId: identifier };
}

export async function enqueueOrderSynchronization(options?: {
  delayMs?: number | undefined;
  orderId?: string | undefined;
}): Promise<{ jobId?: string | undefined }> {
  await ensureRedisLinkReady();
  const queueInstance = acquireSyncQueue();

  const jobPayload =
    typeof options?.orderId === "string" && options.orderId.trim().length > 0
      ? ({
          kind: "order-one",
          orderId: options.orderId.trim(),
        } satisfies SyncJobPayload)
      : ({ kind: "orders-all" } satisfies SyncJobPayload);

  const queuedJob = await queueInstance.add(
    JOB_ORDERS,
    jobPayload,
    typeof options?.delayMs === "number"
      ? { delay: options.delayMs > 0 ? options.delayMs : undefined }
      : undefined,
  );
  const identifier = queuedJob?.id == null ? undefined : `${queuedJob.id}`;
  return { jobId: identifier };
}

export async function closeQueueResourcesGracefully(): Promise<void> {
  const queueCloseTarget = queueSingleton;
  const redisShutdownTarget = redisSingleton;
  queueSingleton = null;

  await queueCloseTarget?.close();
  redisSingleton = null;

  if (!redisShutdownTarget) {
    return;
  }

  await redisShutdownTarget.quit();
}
