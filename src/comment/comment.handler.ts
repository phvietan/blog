import type { Handler } from "hono";
import type { App } from "../types";
import { getPost } from "../databases/post.db";
import { createComment, getComment } from "../databases/comment.db";
import {
  sessionUser,
  visitor,
  rateLimit,
} from "../middlewares/auth.middleware";
import { now } from "../lib/crypto";
import { deliverNotifications } from "./comment.email";
import { parseComment } from "./comment.dto";
import { Message } from "../views/message";

export const submitComment: Handler<App> = async (c) => {
  const post = await getPost(c.env.DB, c.req.param("slug")!);
  if (!post || post.status !== "published") return c.notFound();

  const form = await c.req.formData();
  const user = await sessionUser(c);

  const input = parseComment(form, user?.name);

  if (input.comment_id) {
    const parent = await getComment(c.env.DB, input.comment_id);
    if (!parent || parent.post_id !== post.id || parent.status !== "approved")
      return c.text(
        "The comment you are replying to is not available on this post.",
        400,
      );
  }

  if (!user && !(await rateLimit(c, "comment", 5, 600)))
    return c.text("Please wait a few minutes before commenting again.", 429);

  const id = await createComment(c.env.DB, {
    post_id: post.id,
    ...input,
    visitor: await visitor(c),
    is_admin: user ? 1 : 0,
    created_at: now(),
    status: user ? "approved" : "pending",
  });
  if (!user) c.executionCtx.waitUntil(deliverNotifications(c.env, id));
  const message = user
    ? "Your comment is published."
    : "Thanks! Your comment has been submitted for moderation.";
  if (c.req.header("Accept")?.includes("application/json"))
    return c.json({ id, message, published: !!user }, 201);
  return c.html(Message({ env: c.env, title: "Thank you", message }), 201);
};
