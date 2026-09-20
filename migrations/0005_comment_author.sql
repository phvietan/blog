ALTER TABLE comments ADD COLUMN author_sub TEXT;

CREATE INDEX comments_author ON comments(author_sub) WHERE author_sub IS NOT NULL;
