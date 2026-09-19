import {
  listPendingNotifications,
  claimNotification,
  markNotificationSent,
  retryNotification,
} from "../databases/email-outbox.db";
import { getCommentNotification } from "../databases/comment.db";
import type { Env } from "../types";
import { now } from "../lib/crypto";
import { xml } from "../lib/content";

export async function deliverNotifications(env: Env, commentId?: number) {
  const pending = await listPendingNotifications(env.DB, now(), commentId);
  for (const row of pending) {
    const claim = await claimNotification(env.DB, row.comment_id, now());
    if (!claim) continue;
    try {
      const comment = await getCommentNotification(env.DB, row.comment_id);
      if (!comment) continue;
      const url = new URL(
        `/posts/${comment.slug}/#comment-${comment.id}`,
        env.SITE_URL,
      ).toString();
      const admin = new URL("/admin", env.SITE_URL).toString();
      await env.EMAIL.send({
        from: env.EMAIL_FROM,
        to: env.EMAIL_TO,
        subject: `New ${comment.comment_id ? "reply" : "comment"} on your blog`,
        text: `${comment.name} commented on ${comment.title}\n${comment.comment_id ? `Reply to comment: ${comment.comment_id}\n` : ""}\n${comment.body}\n\nPost: ${url}\nModerate: ${admin}`,
        html: `<h2>New ${comment.comment_id ? "reply" : "comment"} on ${xml(comment.title)}</h2><p>From ${xml(comment.name)}</p><p style="white-space:pre-wrap">${xml(comment.body)}</p><p><a href="${xml(url)}">View post</a> · <a href="${xml(admin)}">Moderate comments</a></p>`,
      });
      await markNotificationSent(env.DB, row.comment_id, now());
    } catch {
      console.error(
        "Comment notification failed; queued for retry",
        row.comment_id,
      );
      await retryNotification(
        env.DB,
        row.comment_id,
        now() + Math.min(86400, 300 * 2 ** Math.min(claim.attempts, 8)),
      );
    }
  }
}
