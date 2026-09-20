import type { Env, Post, Comment } from "../../types";
import { date } from "../../lib/date";
import { Layout } from "../../views/layout";
import { Tags } from "./post-card";

type ThreadComment = Comment & { replies: ThreadComment[] };

function buildThread(comments: Comment[]) {
  const nodes = new Map<number, ThreadComment>(
    comments.map((comment) => [comment.id, { ...comment, replies: [] }]),
  );
  const roots: ThreadComment[] = [];
  for (const comment of nodes.values()) {
    const parent = comment.comment_id ? nodes.get(comment.comment_id) : null;
    if (parent) parent.replies.push(comment);
    else roots.push(comment);
  }
  return roots;
}

function CommentItem({ comment, adminSub }: { comment: ThreadComment; adminSub?: string }) {
  const canEdit = !!comment.is_admin && !!adminSub &&
    (!comment.author_sub || comment.author_sub === adminSub);
  return (
    <div class="thread-item">
      <article class="comment" id={`comment-${comment.id}`}>
        <div>
          <strong>
            {comment.name}
            {comment.is_admin ? <span class="tag">Author</span> : null}
          </strong>
          <time datetime={new Date(comment.created_at * 1000).toISOString()}>
            {date(new Date(comment.created_at * 1000).toISOString())}
          </time>
        </div>
        <p>{comment.body}</p>
        {canEdit && (
          <>
            <button type="button" class="text-button" data-open-modal={`edit-comment-${comment.id}`}>Edit</button>
            <dialog class="edit-dialog" id={`edit-comment-${comment.id}`}>
              <form action={`/comments/${comment.id}/edit`} method="post">
                <h2>Edit comment</h2>
                <textarea name="body" required minlength={2} maxlength={4000} rows={6}>{comment.body}</textarea>
                <div class="dialog-actions">
                  <button type="button" class="button secondary" data-close-modal>Cancel</button>
                  <button class="button" type="submit">Save edit</button>
                </div>
              </form>
            </dialog>
          </>
        )}
        <button type="button" class="text-button" data-reply={comment.id} data-name={comment.name}>Reply</button>
      </article>
      {comment.replies.length > 0 && (
        <div class="comment-children">
          {comment.replies.map((reply) => <CommentItem comment={reply} adminSub={adminSub} />)}
        </div>
      )}
    </div>
  );
}

export function Article({
  env,
  post,
  html,
  comments,
  liked,
  commentPage,
  moreComments,
  adminSub,
}: {
  env: Env;
  post: Post;
  html: string;
  comments: Comment[];
  liked: boolean;
  commentPage: number;
  moreComments: boolean;
  adminSub?: string;
}) {
  return (
    <Layout
      env={env}
      title={post.title}
      description={post.description}
      path={`/posts/${post.slug}/`}
      article={post}
    >
      <article class="article">
        <a href="/" class="back">
          ← All writing
        </a>
        <header class="article-header">
          <Tags tags={post.tags} />
          <h1>{post.title}</h1>
          <p class="dek">{post.description}</p>
          <div class="post-meta">
            <span class="author-avatar">VP</span>
            <strong>Viet An Pham</strong>
            <span>·</span>
            <time datetime={post.published_at}>{date(post.published_at)}</time>
            <span>·</span>
            <span>{post.reading_minutes} min read</span>
            <span>·</span>
            <span>{post.views.toLocaleString()} views</span>
          </div>
        </header>
        <div class="prose" dangerouslySetInnerHTML={{ __html: html }} />
        <div class="article-end">
          <form action={`/posts/${post.slug}/like`} method="post" data-like>
            <button class="button secondary" aria-pressed={liked} type="submit">
              <span aria-hidden="true">♡</span>{" "}
              <span data-like-count>{post.likes}</span>{" "}
              <span data-like-label>{liked ? "Liked" : "Like this post"}</span>
            </button>
          </form>
        </div>
        <p role="status" id="interaction-status" />
      </article>
      <section class="comments" id="comments">
        <div class="section-heading">
          <h2>Join the conversation</h2>
          <span class="muted">No account needed</span>
        </div>
        <form
          action={`/posts/${post.slug}/comments`}
          method="post"
          data-comment
          class="comment-form"
        >
          <input type="hidden" name="comment_id" id="reply-id" />
          <p id="reply-label" hidden>
            Replying to <span id="reply-name" />{" "}
            <button type="button" id="cancel-reply" class="text-button">
              Cancel
            </button>
          </p>
          <label>
            Your name <span class="muted">(optional)</span>
            <input
              name="name"
              maxlength={60}
              placeholder="Anonymous"
              autocomplete="nickname"
            />
          </label>
          <label>
            Your comment
            <textarea
              name="body"
              required
              minlength={2}
              maxlength={4000}
              rows={4}
              placeholder="A thought, a question, a different perspective…"
            />
          </label>
          <div class="honeypot" aria-hidden="true">
            <label>
              Website
              <input name="website" tabindex={-1} autocomplete="off" />
            </label>
          </div>
          <div class="form-footer">
            <small>Comments appear after moderation.</small>
            <button class="button" type="submit">
              Post comment ↗
            </button>
          </div>
          {!adminSub && env.TURNSTILE_SITE_KEY && (
            <div class="cf-turnstile" data-sitekey={env.TURNSTILE_SITE_KEY}></div>
          )}
          <p role="status" data-comment-status />
        </form>
        <div class="comment-thread">
          {buildThread(comments).map((comment) => (
            <CommentItem comment={comment} adminSub={adminSub} />
          ))}
        </div>
        <div class="pagination">
          {commentPage > 1 && (
            <a href={`?comments=${commentPage - 1}#comments`}>
              ← Newer comments
            </a>
          )}
          {moreComments && (
            <a href={`?comments=${commentPage + 1}#comments`}>
              Older comments →
            </a>
          )}
        </div>
      </section>
    </Layout>
  );
}
