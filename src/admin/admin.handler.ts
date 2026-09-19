import { parseId } from "../lib/id";
import { token } from "../lib/crypto";
import type { Handler } from "hono";
import type { App } from "../types";
import * as posts from "../databases/post.db";
import * as tags from "../databases/tag.db";
import * as comments from "../databases/comment.db";
import { markdown, minutes } from "../lib/content";
import { field, parsePost, parsePreview, parseTag } from "./admin.dto";
import { Admin } from "./views/dashboard";
import { Editor } from "./views/editor";
import { Preview } from "./views/preview";

export const dashboard: Handler<App> = async (c) => {
  const page =
    Math.max(1, Math.min(100000, Number(c.req.query("page")) || 1)) | 0;
  const [feed, allTags, recentComments] = await Promise.all([
    posts.listPosts(c.env.DB, page, "", true),
    tags.allTags(c.env.DB),
    comments.listRecentComments(c.env.DB),
  ]);
  return c.html(
    Admin({
      env: c.env,
      ...feed,
      page,
      tags: allTags,
      comments: recentComments,
      name: c.get("user").name,
    }),
  );
};
export const newPost: Handler<App> = async (c) =>
  c.html(Editor({ env: c.env, tags: await tags.allTags(c.env.DB) }));
export const editPost: Handler<App> = async (c) => {
  const post = await posts.getPost(c.env.DB, parseId(c.req.param("id")!), true);
  if (!post) return c.notFound();
  const object = await c.env.BUCKET.get(post.r2_key);
  if (!object) throw new Error("Post Markdown missing");
  return c.html(
    Editor({
      env: c.env,
      post,
      tags: await tags.allTags(c.env.DB),
      source: await object.text(),
    }),
  );
};
export const previewPost: Handler<App> = async (c) => {
  const post = await posts.getPost(c.env.DB, parseId(c.req.param("id")!), true);
  if (!post) return c.notFound();
  const object = await c.env.BUCKET.get(post.r2_key);
  if (!object) throw new Error("Post Markdown missing");
  return c.html(
    Preview({ env: c.env, post, html: markdown(await object.text()) }),
  );
};
export const previewMarkdown: Handler<App> = async (c) => {
  const { body } = await parsePreview(await c.req.formData());
  return c.json({ html: markdown(body) });
};
export const savePost: Handler<App> = async (c) => {
  const rawId = c.req.param("id");
  const id = rawId ? parseId(rawId) : undefined;
  const existing = id ? await posts.getPost(c.env.DB, id, true) : null;
  if (id && !existing) return c.notFound();
  const form = await c.req.formData();
  if (existing && field(form, "version") !== existing.updated_at)
    return c.text(
      "This post changed since you opened it. Copy your edits and reload before saving.",
      409,
    );
  const input = await parsePost(form);
  const validTags = await tags.allTags(c.env.DB);
  if (input.tags.some((id) => !validTags.some((tag) => tag.id === id)))
    return c.text("Select up to 20 existing tags.", 400);
  if (await posts.findDuplicateSlug(c.env.DB, input.slug, id))
    return c.text("That URL slug already belongs to another post.", 409);
  let postId = id;
  // Immutable R2 object versions are independent of database entity IDs.
  const key = `posts/uploads/${token()}.md`;
  const post = {
    slug: input.slug,
    title: input.title,
    description: input.description,
    r2_key: key,
    status: input.status,
    published_at: input.published_at,
    updated_at: new Date().toISOString(),
    reading_minutes: minutes(input.body),
  };
  await c.env.BUCKET.put(key, input.body, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
  });
  try {
    if (existing)
      await posts.updatePost(
        c.env.DB,
        { id: existing.id, ...post },
        input.tags,
      );
    else postId = await posts.createPost(c.env.DB, post, input.tags);
  } catch (error) {
    await c.env.BUCKET.delete(key);
    throw error;
  }
  if (existing) c.executionCtx.waitUntil(c.env.BUCKET.delete(existing.r2_key));
  return c.redirect(`/admin/posts/${postId}`, 303);
};
export const deletePost: Handler<App> = async (c) => {
  const post = await posts.getPost(c.env.DB, parseId(c.req.param("id")!), true);
  if (post) {
    await posts.deletePost(c.env.DB, post.id);
    await c.env.BUCKET.delete(post.r2_key);
  }
  return c.redirect("/admin", 303);
};
export const createTag: Handler<App> = async (c) => {
  const input = parseTag(await c.req.formData());
  const result = await tags.createTag(c.env.DB, input);
  if (!result.meta.changes) return c.text("That tag already exists.", 409);
  return c.redirect("/admin", 303);
};
export const deleteTag: Handler<App> = async (c) => {
  await tags.deleteTag(c.env.DB, parseId(c.req.param("id")!));
  return c.redirect("/admin", 303);
};
export const approveComment: Handler<App> = async (c) => {
  await comments.updateComment(c.env.DB, parseId(c.req.param("id")!), "approved");
  return c.redirect("/admin", 303);
};
export const deleteComment: Handler<App> = async (c) => {
  await comments.deleteComment(c.env.DB, parseId(c.req.param("id")!));
  return c.redirect("/admin", 303);
};
