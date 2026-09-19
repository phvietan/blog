export async function listPendingNotifications(
  db: D1Database,
  now: number,
  commentId: number | null = null,
) {
  return (
    await db
      .prepare(
        "SELECT comment_id FROM email_outbox WHERE sent_at IS NULL AND next_attempt<=? AND (? IS NULL OR comment_id=?) ORDER BY next_attempt LIMIT 20",
      )
      .bind(now, commentId, commentId)
      .all<{ comment_id: number }>()
  ).results;
}
export function claimNotification(
  db: D1Database,
  commentId: number,
  now: number,
) {
  return db
    .prepare(
      "UPDATE email_outbox SET attempts=attempts+1,next_attempt=? WHERE comment_id=? AND sent_at IS NULL AND next_attempt<=? RETURNING attempts",
    )
    .bind(now + 300, commentId, now)
    .first<{ attempts: number }>();
}
export function markNotificationSent(
  db: D1Database,
  commentId: number,
  sentAt: number,
) {
  return db
    .prepare("UPDATE email_outbox SET sent_at=? WHERE comment_id=?")
    .bind(sentAt, commentId)
    .run();
}
export function retryNotification(
  db: D1Database,
  commentId: number,
  nextAttempt: number,
) {
  return db
    .prepare("UPDATE email_outbox SET next_attempt=? WHERE comment_id=?")
    .bind(nextAttempt, commentId)
    .run();
}
export function deleteSentNotifications(db: D1Database, before: number) {
  return db
    .prepare("DELETE FROM email_outbox WHERE sent_at IS NOT NULL AND sent_at<?")
    .bind(before)
    .run();
}
