UPDATE posts
SET description = rtrim(substr(description, 1, 159)) || '…'
WHERE length(description) > 160;
