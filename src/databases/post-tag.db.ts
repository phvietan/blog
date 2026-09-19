export function replacePostTagsStatements(
  db: D1Database,
  postId: number,
  tagIds: number[],
) {
  return [
    db.prepare("DELETE FROM post_tags WHERE post_id=?").bind(postId),
    ...tagIds.map((tagId) =>
      db
        .prepare("INSERT INTO post_tags(post_id,tag_id) VALUES(?,?)")
        .bind(postId, tagId),
    ),
  ];
}
