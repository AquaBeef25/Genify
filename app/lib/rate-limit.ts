
type RateLimitRecord = {
  count: number;
  lastReset: number;
};

// This Map acts as our temporary database in the server's memory
const rateLimitMap = new Map<string, RateLimitRecord>();

export function checkRateLimit(ip: string, limit: number, windowMs: number): { success: boolean, requestsLeft: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // First time we've seen this IP
  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return { success: true, requestsLeft: limit - 1 };
  }

  // If the time window has expired, reset their count
  if (now - record.lastReset > windowMs) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return { success: true, requestsLeft: limit - 1 };
  }

  // If they are within the time window, check if they hit the limit
  if (record.count >= limit) {
    return { success: false, requestsLeft: 0 };
  }

  // Otherwise, increment their count and let them through
  record.count += 1;
  rateLimitMap.set(ip, record);
  return { success: true, requestsLeft: limit - record.count };
}

