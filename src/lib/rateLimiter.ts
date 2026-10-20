/**
 * Client-Side Rate Limiter
 * Stores recent action timestamps in localStorage as a lightweight deterrent against spamming.
 */

export function checkRateLimit(
  key: string,
  maxCount: number,
  windowMs: number
): { allowed: boolean; remainingCount: number; waitSeconds: number } {
  try {
    const storageKey = `ratelimit_${key}`;
    const raw = localStorage.getItem(storageKey);
    const now = Date.now();
    const timestamps: number[] = raw ? JSON.parse(raw) : [];

    // Filter out timestamps outside window
    const valid = timestamps.filter((t) => now - t < windowMs);

    if (valid.length >= maxCount) {
      const oldest = Math.min(...valid);
      const waitSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
      return { allowed: false, remainingCount: 0, waitSeconds: Math.max(1, waitSeconds) };
    }

    return { allowed: true, remainingCount: maxCount - valid.length, waitSeconds: 0 };
  } catch {
    return { allowed: true, remainingCount: 1, waitSeconds: 0 };
  }
}

export function recordRateLimitAction(key: string, windowMs: number): void {
  try {
    const storageKey = `ratelimit_${key}`;
    const raw = localStorage.getItem(storageKey);
    const now = Date.now();
    const timestamps: number[] = raw ? JSON.parse(raw) : [];

    const valid = timestamps.filter((t) => now - t < windowMs);
    valid.push(now);

    localStorage.setItem(storageKey, JSON.stringify(valid));
  } catch (e) {
    console.warn("[RateLimiter] Error saving action:", e);
  }
}
