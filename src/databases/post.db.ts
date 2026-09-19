import { replacePostTagsStatements } from "./post-tag.db";
import type { Post } from "../types";

const select = `SELECT p.*, (SELECT count(*) FROM likes l WHERE l.post_id=p.id) AS likes,
 COALESCE((SELECT json_group_array(json_object('id',t.id,'name',t.name,'slug',t.slug)) FROM tags t JOIN post_tags pt ON pt.tag_id=t.id WHERE pt.post_id=p.id),'[]') AS tags FROM posts p`;

const decode = (p: Record<string, unknown>) =>
  ({ ...p, tags: JSON.parse(p.tags as string) }) as Post;

export async function listPosts(
  db: D1Database,
  page = 1,
  tag = "",
  admin = false,
) {
  const rows = await db
    .prepare(
      `${select} WHERE (?=1 OR p.status='published') AND (?='' OR EXISTS(SELECT 1 FROM post_tags pt JOIN tags t ON t.id=pt.tag_id WHERE pt.post_id=p.id AND t.slug=?)) ORDER BY p.published_at DESC,p.id DESC LIMIT 11 OFFSET ?`,
    )
    .bind(admin ? 1 : 0, tag, tag, (page - 1) * 10)
    .all();
  return {
    posts: rows.results.slice(0, 10).map(decode),
    more: rows.results.length > 10,
  };
}
export async function getPost(
  db: D1Database,
  value: string | number,
  byId = false,
) {
  const row = await db
    .prepare(`${select} WHERE p.${byId ? "id" : "slug"}=?`)
    .bind(value)
    .first();
  return row ? decode(row) : null;
}

export type PostWrite = Pick<
  Post,
  | "id"
  | "slug"
  | "title"
  | "description"
  | "r2_key"
  | "status"
  | "published_at"
  | "updated_at"
  | "reading_minutes"
>;

export async function createPost(
  db: D1Database,
  post: Omit<PostWrite, "id">,
  tagIds: number[],
) {
  const results = await db.batch<{ id: number }>([
    db
      .prepare(
        "INSERT INTO posts(slug,title,description,r2_key,status,published_at,updated_at,reading_minutes) VALUES(?,?,?,?,?,?,?,?) RETURNING id",
      )
      .bind(
        post.slug,
        post.title,
        post.description,
        post.r2_key,
        post.status,
        post.published_at,
        post.updated_at,
        post.reading_minutes,
      ),
    ...tagIds.map((tagId) =>
      db
        .prepare(
          "INSERT INTO post_tags(post_id,tag_id) SELECT id,? FROM posts WHERE slug=?",
        )
        .bind(tagId, post.slug),
    ),
  ]);
  return results[0].results[0].id;
}
export function updatePost(db: D1Database, post: PostWrite, tagIds: number[]) {
  return db.batch([
    db
      .prepare(
        "UPDATE posts SET slug=?,title=?,description=?,r2_key=?,status=?,published_at=?,updated_at=?,reading_minutes=? WHERE id=?",
      )
      .bind(
        post.slug,
        post.title,
        post.description,
        post.r2_key,
        post.status,
        post.published_at,
        post.updated_at,
        post.reading_minutes,
        post.id,
      ),
    ...replacePostTagsStatements(db, post.id, tagIds),
  ]);
}
export function deletePost(db: D1Database, id: number) {
  return db.prepare("DELETE FROM posts WHERE id=?").bind(id).run();
}
export function findDuplicateSlug(db: D1Database, slug: string, exceptId = 0) {
  return db
    .prepare("SELECT id FROM posts WHERE slug=? AND id<>?")
    .bind(slug, exceptId)
    .first<{ id: number }>();
}
export async function incrementViews(db: D1Database, id: number) {
  const row = await db
    .prepare("UPDATE posts SET views=views+1 WHERE id=? RETURNING views")
    .bind(id)
    .first<{ views: number }>();
  return row!.views;
}
export async function listPublishedPosts(db: D1Database, limit = -1) {
  return (
    await db
      .prepare(
        "SELECT slug,title,description,published_at,updated_at FROM posts WHERE status='published' ORDER BY published_at DESC,id DESC LIMIT ?",
      )
      .bind(limit)
      .all<
        Pick<
          Post,
          "slug" | "title" | "description" | "published_at" | "updated_at"
        >
      >()
  ).results;
}
