CREATE TABLE posts (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', r2_key TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 published_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 views INTEGER NOT NULL DEFAULT 0, reading_minutes INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX posts_feed ON posts(status, published_at DESC, id DESC);
CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE);
CREATE TABLE post_tags (
 post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
 tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY(post_id,tag_id)
);
CREATE INDEX post_tags_tag ON post_tags(tag_id, post_id);
CREATE TABLE likes (
 post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
 visitor TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(post_id,visitor)
);
CREATE TABLE comments (
 id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
 name TEXT NOT NULL, body TEXT NOT NULL, visitor TEXT NOT NULL,
 comment_id TEXT REFERENCES comments(id) ON DELETE SET NULL, is_admin INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved'))
);
CREATE INDEX comments_post ON comments(post_id,status,created_at);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, sub TEXT NOT NULL, name TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 1, expires_at INTEGER NOT NULL);
CREATE INDEX rate_limits_expiry ON rate_limits(expires_at);

CREATE TABLE email_outbox (
 comment_id TEXT PRIMARY KEY REFERENCES comments(id) ON DELETE CASCADE,
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0,
 sent_at INTEGER
);
CREATE INDEX email_outbox_pending ON email_outbox(sent_at,next_attempt);
