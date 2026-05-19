export async function sleepMs(durationMs: number): Promise<void> {
  if (durationMs <= 0) {
    await Promise.resolve();
    return;
  }
  await new Promise<void>((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

export function computeBackoffDelayMs(retriesDone: number, baseDelayMs = 750): number {
  if (!Number.isFinite(retriesDone) || retriesDone < 0) {
    return baseDelayMs;
  }
  const jitter = Math.floor(Math.random() * 350);
  return baseDelayMs * 2 ** retriesDone + jitter;
}

export async function backoffRun<T>(
  maxAttempts: number,
  operation: () => Promise<T>,
  contextLabel: string,
): Promise<T> {
  if (maxAttempts <= 0) {
    throw new Error(`${contextLabel}: maxAttempts must be positive`);
  }
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      attempts += 1;
      const isFinal = attempts >= maxAttempts;
      if (isFinal) {
        throw error instanceof Error ? error : new Error(String(error));
      }
      const backoff = computeBackoffDelayMs(attempts - 1);
      console.warn(`${contextLabel} attempt ${attempts} failed — retry in ${backoff}ms`);
      await sleepMs(backoff);
    }
  }
  throw new Error(`${contextLabel}: exhausted retries unexpectedly`);
}
