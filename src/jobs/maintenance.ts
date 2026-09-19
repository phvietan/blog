import type { Env } from "../types";
import { now } from "../lib/crypto";
import { deliverNotifications } from "../comment/comment.email";
import { deleteExpiredSessions } from "../databases/session.db";
import { deleteExpiredRateLimits } from "../databases/rate-limit.db";
import { deleteSentNotifications } from "../databases/email-outbox.db";

export async function scheduled(
  _event: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
) {
  ctx.waitUntil(deliverNotifications(env));
  const time = now();
  ctx.waitUntil(
    Promise.all([
      deleteExpiredSessions(env.DB, time),
      deleteExpiredRateLimits(env.DB, time),
      deleteSentNotifications(env.DB, time - 604800),
    ]),
  );
}
