export function incrementRateLimit(
  db: D1Database,
  key: string,
  now: number,
  seconds: number,
) {
  return db
    .prepare(
      "INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING count",
    )
    .bind(key, now + seconds, now, now)
    .first<{ count: number }>();
}
export function deleteExpiredRateLimits(db: D1Database, now: number) {
  return db
    .prepare("DELETE FROM rate_limits WHERE expires_at<=?")
    .bind(now)
    .run();
}
