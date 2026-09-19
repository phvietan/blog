-- Preserve existing records and R2 keys while converting entity IDs and relations.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE _post_ids AS SELECT id AS old_id, row_number() OVER (ORDER BY published_at,id) AS new_id FROM posts;
CREATE TABLE _tag_ids AS SELECT id AS old_id, row_number() OVER (ORDER BY name,id) AS new_id FROM tags;
CREATE TABLE _comment_ids AS SELECT id AS old_id, row_number() OVER (ORDER BY created_at,id) AS new_id FROM comments;

CREATE TABLE posts_new (
 id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', r2_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 published_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 views INTEGER NOT NULL DEFAULT 0, reading_minutes INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE tags_new (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE);
CREATE TABLE post_tags_new (
 post_id INTEGER NOT NULL REFERENCES posts_new(id) ON DELETE CASCADE,
 tag_id INTEGER NOT NULL REFERENCES tags_new(id) ON DELETE CASCADE, PRIMARY KEY(post_id,tag_id)
);
CREATE TABLE likes_new (
 post_id INTEGER NOT NULL REFERENCES posts_new(id) ON DELETE CASCADE,
 visitor TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(post_id,visitor)
);
CREATE TABLE comments_new (
 id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL REFERENCES posts_new(id) ON DELETE CASCADE,
 name TEXT NOT NULL, body TEXT NOT NULL, visitor TEXT NOT NULL,
 comment_id INTEGER REFERENCES comments_new(id) ON DELETE SET NULL, is_admin INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved'))
);
CREATE TABLE email_outbox_new (
 comment_id INTEGER PRIMARY KEY REFERENCES comments_new(id) ON DELETE CASCADE,
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0, sent_at INTEGER
);
INSERT INTO posts_new SELECT m.new_id,p.slug,p.title,p.description,p.r2_key,p.status,p.published_at,p.updated_at,p.views,p.reading_minutes FROM posts p JOIN _post_ids m ON m.old_id=p.id;
INSERT INTO tags_new SELECT m.new_id,t.name,t.slug FROM tags t JOIN _tag_ids m ON m.old_id=t.id;
INSERT INTO post_tags_new SELECT p.new_id,t.new_id FROM post_tags pt JOIN _post_ids p ON p.old_id=pt.post_id JOIN _tag_ids t ON t.old_id=pt.tag_id;
INSERT INTO likes_new SELECT p.new_id,l.visitor,l.created_at FROM likes l JOIN _post_ids p ON p.old_id=l.post_id;
INSERT INTO comments_new SELECT m.new_id,p.new_id,c.name,c.body,c.visitor,parent.new_id,c.is_admin,c.created_at,c.status FROM comments c JOIN _comment_ids m ON m.old_id=c.id JOIN _post_ids p ON p.old_id=c.post_id LEFT JOIN _comment_ids parent ON parent.old_id=c.comment_id;
INSERT INTO email_outbox_new SELECT m.new_id,e.attempts,e.next_attempt,e.sent_at FROM email_outbox e JOIN _comment_ids m ON m.old_id=e.comment_id;

DROP TABLE email_outbox;
DROP TABLE comments;
DROP TABLE likes;
DROP TABLE post_tags;
DROP TABLE posts;
DROP TABLE tags;
ALTER TABLE posts_new RENAME TO posts;
ALTER TABLE tags_new RENAME TO tags;
ALTER TABLE post_tags_new RENAME TO post_tags;
ALTER TABLE likes_new RENAME TO likes;
ALTER TABLE comments_new RENAME TO comments;
ALTER TABLE email_outbox_new RENAME TO email_outbox;
DROP TABLE _post_ids;
DROP TABLE _tag_ids;
DROP TABLE _comment_ids;
DROP TABLE IF EXISTS oauth_states;
CREATE INDEX posts_feed ON posts(status,published_at DESC,id DESC);
CREATE INDEX post_tags_tag ON post_tags(tag_id,post_id);
CREATE INDEX comments_post ON comments(post_id,status,created_at);
CREATE INDEX email_outbox_pending ON email_outbox(sent_at,next_attempt);
-- Enqueue atomically using the database-generated comment ID.
CREATE TRIGGER comments_notify AFTER INSERT ON comments WHEN NEW.is_admin=0
BEGIN
 INSERT INTO email_outbox(comment_id) VALUES(NEW.id);
END;
PRAGMA defer_foreign_keys = OFF;
