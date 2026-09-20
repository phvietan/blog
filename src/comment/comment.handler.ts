import type { Handler } from "hono";
import type { App } from "../types";
import { getPost } from "../databases/post.db";
import { createComment, getComment, updateAdminCommentBody } from "../databases/comment.db";
import {
  sessionUser,
  visitor,
} from "../middlewares/auth.middleware";
import { now } from "../lib/crypto";
import { deliverNotifications } from "./comment.email";
import { parseComment, parseCommentBody } from "./comment.dto";
import { parseId } from "../lib/id";
import { Message } from "../views/message";

async function validTurnstile(c: Parameters<Handler<App>>[0], form: FormData) {
  if (!c.env.TURNSTILE_SECRET_KEY) return new URL(c.req.url).hostname === "localhost";
  const token = String(form.get("cf-turnstile-response") || "");
  if (!token) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: c.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: c.req.header("CF-Connecting-IP") || "",
    }),
  });
  if (!response.ok) return false;
  const result = await response.json<{ success?: boolean }>();
  return result.success === true;
}

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

  if (!user && !(await validTurnstile(c, form)))
    return c.text("Please complete the verification and try again.", 400);

  const id = await createComment(c.env.DB, {
    post_id: post.id,
    ...input,
    visitor: await visitor(c),
    is_admin: user ? 1 : 0,
    author_sub: user?.sub || null,
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

export const editComment: Handler<App> = async (c) => {
  const user = await sessionUser(c);
  if (!user) return c.text("Sign in required.", 401);
  const id = parseId(c.req.param("id")!);
  const comment = id ? await getComment(c.env.DB, id) : null;
  if (!comment || !comment.is_admin || (comment.author_sub && comment.author_sub !== user.sub))
    return c.text("You can only edit your own comments.", 403);
  const form = await c.req.formData();
  const body = parseCommentBody(form);
  await updateAdminCommentBody(c.env.DB, id!, user.sub, body);
  if (form.get("return_to") === "/admin") return c.redirect("/admin", 303);
  const post = await getPost(c.env.DB, comment.post_id);
  return post
    ? c.redirect(`/posts/${post.slug}/#comment-${id}`, 303)
    : c.redirect("/admin", 303);
};
