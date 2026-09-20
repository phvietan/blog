import { parseId } from "../lib/id";
import type { Handler } from "hono";
import type { App } from "../types";
import { getPost, listPosts, incrementViews } from "../databases/post.db";
import { allTags } from "../databases/tag.db";
import { getCommentPage, listApprovedComments } from "../databases/comment.db";
import { hasLike, createLike, countLikes } from "../databases/like.db";
import { visitor, sessionUser } from "../middlewares/auth.middleware";
import { now } from "../lib/crypto";
import { markdown } from "../lib/content";
import { parseFeed, pageNumber } from "./post.dto";
import { Home } from "./views/home";
import { Article } from "./views/article";
import { Cards } from "./views/post-card";

export const home: Handler<App> = async (c) => {
  const { page, tag } = parseFeed(c.req.query());
  const [feed, tags] = await Promise.all([
    listPosts(c.env.DB, page, tag),
    allTags(c.env.DB),
  ]);
  return c.html(Home({ env: c.env, ...feed, tags, tag, page }));
};
export const feed: Handler<App> = async (c) => {
  const { page, tag } = parseFeed(c.req.query());
  const { posts, more } = await listPosts(c.env.DB, page, tag);
  c.header("X-Robots-Tag", "noindex");
  return c.json({ html: await Cards({ posts }).toString(), more });
};
export const redirectIndex: Handler<App> = (c) => c.redirect("/", 301);
export const canonicalPost: Handler<App> = (c) =>
  c.redirect(
    `/posts/${encodeURIComponent(c.req.param("slug")!)}/${new URL(c.req.url).search}`,
    301,
  );
export const article: Handler<App> = async (c) => {
  const post = await getPost(c.env.DB, c.req.param("slug")!);
  if (!post || post.status !== "published") return c.notFound();
  const object = await c.env.BUCKET.get(post.r2_key);
  if (!object) throw new Error("Published Markdown missing");
  const visitorId = await visitor(c);
  c.header("Cache-Control", "private, no-store");
  if (c.req.method !== "HEAD")
    post.views = await incrementViews(c.env.DB, post.id);
  let commentPage = pageNumber(c.req.query("comments"));
  const commentId = c.req.query("comment");
  if (commentId)
    commentPage =
      (await getCommentPage(c.env.DB, post.id, parseId(commentId))) ||
      commentPage;
  const [thread, liked, user] = await Promise.all([
    listApprovedComments(c.env.DB, post.id, commentPage),
    hasLike(c.env.DB, post.id, visitorId),
    sessionUser(c),
  ]);
  return c.html(
    Article({
      env: c.env,
      post,
      html: markdown(await object.text()),
      comments: thread.comments,
      liked,
      commentPage,
      moreComments: thread.more,
      adminSub: user?.sub,
    }),
  );
};
export const like: Handler<App> = async (c) => {
  const post = await getPost(c.env.DB, c.req.param("slug")!);
  if (!post || post.status !== "published") return c.notFound();
  await createLike(c.env.DB, post.id, await visitor(c), now());
  const likes = await countLikes(c.env.DB, post.id);
  if (c.req.header("Accept")?.includes("application/json"))
    return c.json({ likes, liked: true });
  return c.redirect(`/posts/${post.slug}/`, 303);
};
