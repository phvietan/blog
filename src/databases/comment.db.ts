import type { Comment } from "../types";

export type CommentWrite = Pick<
  Comment,
  "id" | "name" | "body" | "comment_id" | "is_admin" | "author_sub" | "created_at"
> & {
  post_id: number;
  visitor: string;
  status: "pending" | "approved";
};
export async function createComment(
  db: D1Database,
  comment: Omit<CommentWrite, "id">,
) {
  // The comments_notify trigger queues non-admin email in this same transaction.
  const row = await db
    .prepare(
      "INSERT INTO comments(post_id,name,body,visitor,comment_id,is_admin,author_sub,created_at,status) VALUES(?,?,?,?,?,?,?,?,?) RETURNING id",
    )
    .bind(
      comment.post_id,
      comment.name,
      comment.body,
      comment.visitor,
      comment.comment_id,
      comment.is_admin,
      comment.author_sub,
      comment.created_at,
      comment.status,
    )
    .first<{ id: number }>();
  return row!.id;
}
export function getComment(db: D1Database, id: number) {
  return db
    .prepare("SELECT * FROM comments WHERE id=?")
    .bind(id)
    .first<CommentWrite>();
}
export async function listRecentComments(db: D1Database) {
  return (
    await db
      .prepare(
        "SELECT c.*,p.title FROM comments c JOIN posts p ON p.id=c.post_id ORDER BY c.created_at DESC,c.id DESC LIMIT 100",
      )
      .all<Comment>()
  ).results;
}
export async function listApprovedComments(
  db: D1Database,
  postId: number,
  page: number,
) {
  const rows = await db
    .prepare(
      "SELECT c.*,parent.name AS parent_name FROM comments c LEFT JOIN comments parent ON parent.id=c.comment_id WHERE c.post_id=? AND c.status='approved' ORDER BY COALESCE(parent.created_at,c.created_at) DESC,COALESCE(parent.id,c.id) DESC,CASE WHEN c.comment_id IS NULL THEN 0 ELSE 1 END,c.created_at ASC,c.id ASC LIMIT 51 OFFSET ?",
    )
    .bind(postId, (page - 1) * 50)
    .all<Comment>();
  return {
    comments: rows.results.slice(0, 50),
    more: rows.results.length > 50,
  };
}
export async function getCommentPage(
  db: D1Database,
  postId: number,
  commentId: number,
) {
  const row = await db
    .prepare(
      "SELECT count(*) AS n FROM comments WHERE post_id=? AND status='approved' AND (created_at,id) >= (SELECT created_at,id FROM comments WHERE id=? AND post_id=? AND status='approved')",
    )
    .bind(postId, commentId, postId)
    .first<{ n: number }>();
  return row?.n ? Math.ceil(row.n / 50) : null;
}
export function updateComment(
  db: D1Database,
  id: number,
  status: "pending" | "approved",
) {
  return db
    .prepare("UPDATE comments SET status=? WHERE id=?")
    .bind(status, id)
    .run();
}
export function updateAdminCommentBody(
  db: D1Database,
  id: number,
  authorSub: string,
  body: string,
) {
  return db
    .prepare("UPDATE comments SET body=?,author_sub=COALESCE(author_sub,?) WHERE id=? AND is_admin=1 AND (author_sub=? OR author_sub IS NULL)")
    .bind(body, authorSub, id, authorSub)
    .run();
}
export function deleteComment(db: D1Database, id: number) {
  return db.prepare("DELETE FROM comments WHERE id=?").bind(id).run();
}
export function getCommentNotification(db: D1Database, id: number) {
  return db
    .prepare(
      "SELECT c.*,p.slug,p.title FROM comments c JOIN posts p ON p.id=c.post_id WHERE c.id=?",
    )
    .bind(id)
    .first<CommentWrite & { slug: string; title: string }>();
}
