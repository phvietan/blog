import type { Tag } from "../types";

export async function allTags(db: D1Database) {
  return (
    await db
      .prepare("SELECT * FROM tags ORDER BY name COLLATE NOCASE")
      .all<Tag>()
  ).results;
}
export function getTag(db: D1Database, id: number) {
  return db.prepare("SELECT * FROM tags WHERE id=?").bind(id).first<Tag>();
}
export function createTag(db: D1Database, tag: Omit<Tag, "id">) {
  return db
    .prepare(
      "INSERT INTO tags(name,slug) VALUES(?,?) ON CONFLICT DO NOTHING",
    )
    .bind(tag.name, tag.slug)
    .run();
}
export function updateTag(db: D1Database, tag: Tag) {
  return db
    .prepare("UPDATE tags SET name=?,slug=? WHERE id=?")
    .bind(tag.name, tag.slug, tag.id)
    .run();
}
export function deleteTag(db: D1Database, id: number) {
  return db.prepare("DELETE FROM tags WHERE id=?").bind(id).run();
}
