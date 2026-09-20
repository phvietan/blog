-- Import comments from the previous blog database. Resolve posts by slug so
-- this remains valid regardless of the integer IDs assigned to posts.
INSERT INTO comments (
  post_id, name, body, visitor, comment_id, is_admin, author_sub, created_at, status
)
SELECT id, 'Viet Phan', 'Thanks for useful post!', 'legacy-comment-5', NULL, 0, NULL,
       unixepoch('2025-09-28 18:46:20'), 'approved'
FROM posts
WHERE slug = 'bidirectional-http'
  AND NOT EXISTS (SELECT 1 FROM comments WHERE visitor = 'legacy-comment-5');

INSERT INTO comments (
  post_id, name, body, visitor, comment_id, is_admin, author_sub, created_at, status
)
SELECT id, 'Son Phan', 'Tysm for ur great insight, learned alot from this post. ', 'legacy-comment-6', NULL, 0, NULL,
       unixepoch('2025-09-28 19:40:03'), 'approved'
FROM posts
WHERE slug = 'bidirectional-http'
  AND NOT EXISTS (SELECT 1 FROM comments WHERE visitor = 'legacy-comment-6');

INSERT INTO comments (
  post_id, name, body, visitor, comment_id, is_admin, author_sub, created_at, status
)
SELECT id, 'Viet An Pham', 'Your comments always motivate me to research more, thank you !!!', 'legacy-comment-7', NULL, 1, NULL,
       unixepoch('2025-10-01 12:49:37'), 'approved'
FROM posts
WHERE slug = 'bidirectional-http'
  AND NOT EXISTS (SELECT 1 FROM comments WHERE visitor = 'legacy-comment-7');

INSERT INTO comments (
  post_id, name, body, visitor, comment_id, is_admin, author_sub, created_at, status
)
SELECT id, 'Viet An Pham', 'Interestingly, someone notice about this behavior and tried to create pull request to WebKit, kudo to them: https://github.com/TACIXAT/XorShift128Plus/issues/9#issuecomment-3355407189', 'legacy-comment-8', NULL, 1, NULL,
       unixepoch('2025-10-01 12:54:15'), 'approved'
FROM posts
WHERE slug = 'jsc-randomness-predictor'
  AND NOT EXISTS (SELECT 1 FROM comments WHERE visitor = 'legacy-comment-8');

INSERT INTO comments (
  post_id, name, body, visitor, comment_id, is_admin, author_sub, created_at, status
)
SELECT id, 'Bold', 'How to comment?', 'legacy-comment-9', NULL, 0, NULL,
       unixepoch('2026-01-05 15:45:33'), 'approved'
FROM posts
WHERE slug = 'game-hack'
  AND NOT EXISTS (SELECT 1 FROM comments WHERE visitor = 'legacy-comment-9');

-- The insert trigger queues mail for non-admin comments. These are historical,
-- so discard only the outbox entries created for this import.
DELETE FROM email_outbox
WHERE comment_id IN (
  SELECT id FROM comments WHERE visitor LIKE 'legacy-comment-%'
);
