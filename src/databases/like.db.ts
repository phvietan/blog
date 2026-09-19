export function createLike(
  db: D1Database,
  postId: number,
  visitor: string,
  createdAt: number,
) {
  // One like per browser and post, including concurrent requests and retries.
  return db
    .prepare(
      "INSERT INTO likes(post_id,visitor,created_at) VALUES(?,?,?) ON CONFLICT DO NOTHING",
    )
    .bind(postId, visitor, createdAt)
    .run();
}
export async function hasLike(db: D1Database, postId: number, visitor: string) {
  return !!(await db
    .prepare("SELECT 1 FROM likes WHERE post_id=? AND visitor=?")
    .bind(postId, visitor)
    .first());
}
export async function countLikes(db: D1Database, postId: number) {
  return (await db
    .prepare("SELECT count(*) AS likes FROM likes WHERE post_id=?")
    .bind(postId)
    .first<{ likes: number }>())!.likes;
}
export function deleteLike(db: D1Database, postId: number, visitor: string) {
  return db
    .prepare("DELETE FROM likes WHERE post_id=? AND visitor=?")
    .bind(postId, visitor)
    .run();
}
