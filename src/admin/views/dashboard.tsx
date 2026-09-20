import type { Env, Post, Tag, Comment } from "../../types";
import { date } from "../../lib/date";
import { Layout } from "../../views/layout";
export function Admin({
  env,
  posts,
  tags,
  comments,
  name,
  userSub,
  page,
  more,
}: {
  env: Env;
  posts: Post[];
  tags: Tag[];
  comments: Comment[];
  name: string;
  userSub: string;
  page: number;
  more: boolean;
}) {
  return (
    <Layout env={env} title="Admin" path="/admin" admin>
      <div class="admin-heading">
        <div class="eyebrow">PUBLISHING DESK</div>
        <h1>Your words, out there.</h1>
        <div class="toolbar">
          <span>Signed in as {name}</span>
          <form action="/oauth2/logout" method="post">
            <button class="text-button">Sign out</button>
          </form>
          <a class="button" href="/admin/posts/new">
            New post +
          </a>
        </div>
      </div>
      <section class="panel">
        <h2>Posts</h2>
        {!posts.length && (
          <p class="muted">Create your first post or import a Markdown file.</p>
        )}
        {posts.map((p) => (
          <div class="admin-row">
            <div>
              <a href={`/admin/posts/${p.id}`}>
                <strong>{p.title}</strong>
              </a>
              <small>
                {p.status} · {date(p.published_at)} · {p.views} views ·{" "}
                {p.likes} likes
              </small>
            </div>
            <a href={`/admin/posts/${p.id}`} class="text-link">
              Edit ↗
            </a>
          </div>
        ))}
        <div class="pagination">
          {page > 1 && <a href={`/admin?page=${page - 1}`}>← Previous</a>}
          {more && <a href={`/admin?page=${page + 1}`}>Next →</a>}
        </div>
      </section>
      <section class="panel">
        <h2>Tags</h2>
        <form action="/admin/tags" method="post" class="inline-form">
          <label>
            New tag
            <input
              name="name"
              required
              maxlength={40}
              placeholder="Security research"
            />
          </label>
          <button class="button">Create tag</button>
        </form>
        <div class="tag-admin">
          {tags.map((t) => (
            <form
              action={`/admin/tags/${t.id}/delete`}
              method="post"
              data-confirm="Remove this tag from all posts?"
            >
              <span>{t.name}</span>
              <button aria-label={`Delete ${t.name}`} class="text-button">
                ×
              </button>
            </form>
          ))}
        </div>
      </section>
      <section class="panel">
        <h2>Comment moderation</h2>
        <p class="muted">
          Latest 100 comments. Approve pending comments or remove spam.
        </p>
        {!comments.length && <p>No comments yet.</p>}
        {comments.map((cm) => (
          <article class="moderation">
            <small>
              {cm.title} · {cm.status}
            </small>
            <strong>{cm.name}</strong>
            {cm.is_admin && (!cm.author_sub || cm.author_sub === userSub) ? (
              <form action={`/comments/${cm.id}/edit`} method="post" class="comment-edit">
                <input type="hidden" name="return_to" value="/admin" />
                <textarea name="body" required minlength={2} maxlength={4000} rows={3}>{cm.body}</textarea>
                <button class="button secondary" type="submit">Save edit</button>
              </form>
            ) : <p>{cm.body}</p>}
            <div class="toolbar">
              {cm.status === "pending" && (
                <form action={`/admin/comments/${cm.id}/approve`} method="post">
                  <button class="button secondary">Approve</button>
                </form>
              )}
              <form action={`/admin/comments/${cm.id}/delete`} method="post">
                <button class="text-button danger">Delete</button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </Layout>
  );
}
