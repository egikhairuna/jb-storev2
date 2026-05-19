import type { Job } from "bullmq";
import { Worker } from "bullmq";

import {
  SYNC_QUEUE_NAME,
  acquireRedisSingleton,
  acquireSyncQueue,
  closeQueueResourcesGracefully,
  JOB_PRODUCTS,
  type SyncJobPayload,
} from "@/lib/queue/queue";
import {
  runProductSyncIncremental,
} from "@/lib/sync/product-sync";
import {
  syncConfig,
} from "@/lib/sync-config";

async function handleSyncPipeline(jobSnapshot: Job<SyncJobPayload>): Promise<void> {
  if (jobSnapshot.name === JOB_PRODUCTS) {
    const payload = jobSnapshot.data as { force?: boolean };
    await runProductSyncIncremental({ force: payload.force });
    return;
  }



  console.warn(`Ignored unknown sync job identifier: ${jobSnapshot.name}`);
}

async function registerRepeatableSweepers(): Promise<void> {
  const queueInstance = acquireSyncQueue();

  if (syncConfig.productSyncEveryMs > 0) {
    await queueInstance.add(
      JOB_PRODUCTS,
      {
        kind: "products",
      } satisfies SyncJobPayload,
      {
        jobId: "repeat-products",
        repeat: {
          every: syncConfig.productSyncEveryMs,
        },
      },
    );
  }


}

async function bootstrapManagedWorkerRuntime(): Promise<void> {
  if (
    typeof process.env.ENABLE_WORKER !== "string" ||
    process.env.ENABLE_WORKER.trim() !== "true"
  ) {
    console.info("ENABLE_WORKER is not set to true — worker runtime skipped.");
    return;
  }

  const redisBridge = acquireRedisSingleton();
  await redisBridge.connect();

  await registerRepeatableSweepers();

  const pooledConcurrencyBaseline = Math.max(
    syncConfig.syncProductsConcurrency,
    1,
  );

  const workerInstance = new Worker<SyncJobPayload>(
    SYNC_QUEUE_NAME,
    async (incomingJobPipeline) =>
      handleSyncPipeline(incomingJobPipeline),
    {
      connection: redisBridge,
      concurrency: pooledConcurrencyBaseline,
    },
  );

  workerInstance.on("completed", (finishedJobPayload) => {
    console.debug(`Job finalized: ${finishedJobPayload?.id}`);
  });

  workerInstance.on("failed", (failedJobCandidate, rejectionReasonCaptured) => {
    console.error(
      `Sync job (${failedJobCandidate?.id ?? "anonymous"}) failed:`,
      rejectionReasonCaptured instanceof Error
        ? rejectionReasonCaptured.stack ?? rejectionReasonCaptured.message
        : rejectionReasonCaptured,
    );
  });

  let isShuttingDown = false;

  const teardownRuntime = (): void => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    workerInstance
      .close()
      .then(async () => {
        await closeQueueResourcesGracefully();
        console.info("Worker halted cleanly.");
        process.exit(0);
      })
      .catch((failureCapturedDuringTeardown) => {
        console.error("Worker teardown failed abruptly:", failureCapturedDuringTeardown);
        redisBridge.disconnect(false);
        process.exit(1);
      });
  };

  process.once("SIGINT", teardownRuntime);
  process.once("SIGTERM", teardownRuntime);
}

void bootstrapManagedWorkerRuntime().catch((diagnosticCaptured) => {
  console.error("Worker initialization failed permanently:", diagnosticCaptured);
  process.exit(1);
});
