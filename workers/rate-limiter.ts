async function hashIP(ip: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function checkRateLimit(
  db: D1Database,
  ip: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = 5; // Total free requests per 24 hours (BYOP key bypasses)
  const ipHash = await hashIP(ip);
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 24 * 60 * 60;

  try {
    const record = await db.prepare(
      "SELECT request_count, last_request FROM rate_limits WHERE ip_hash = ?"
    )
      .bind(ipHash)
      .first<{ request_count: number; last_request: number }>();

    if (!record) {
      // First request
      await db.prepare(
        "INSERT INTO rate_limits (ip_hash, request_count, last_request) VALUES (?, 1, ?)"
      )
        .bind(ipHash, now)
        .run();
      return { allowed: true, remaining: limit - 1, limit };
    }

    if (record.last_request < oneDayAgo) {
      // Reset limit
      await db.prepare(
        "UPDATE rate_limits SET request_count = 1, last_request = ? WHERE ip_hash = ?"
      )
        .bind(now, ipHash)
        .run();
      return { allowed: true, remaining: limit - 1, limit };
    }

    if (record.request_count >= limit) {
      return { allowed: false, remaining: 0, limit };
    }

    // Increment count
    await db.prepare(
      "UPDATE rate_limits SET request_count = request_count + 1, last_request = ? WHERE ip_hash = ?"
    )
      .bind(now, ipHash)
      .run();

    return { allowed: true, remaining: limit - (record.request_count + 1), limit };
  } catch (err) {
    console.error("D1 Rate Limit database error:", err);
    // Fail-open to avoid locking out users in case D1 goes down
    return { allowed: true, remaining: 1, limit };
  }
}
