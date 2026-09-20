import type { Env, Post, Tag } from "../../types";
import { Layout } from "../../views/layout";
export function Editor({
  env,
  post,
  tags,
  source = "",
}: {
  env: Env;
  post?: Post;
  tags: Tag[];
  source?: string;
}) {
  return (
    <Layout
      env={env}
      title={post ? "Edit post" : "New post"}
      path="/admin"
      admin
    >
      <a class="back" href="/admin">
        ← Publishing desk
      </a>
      <h1>{post ? "Make it yours." : "Start a new story."}</h1>
      <form
        action={post ? `/admin/posts/${post.id}` : "/admin/posts"}
        method="post"
        enctype="multipart/form-data"
        id="editor"
        class="panel"
      >
        <input type="hidden" name="version" value={post?.updated_at || ""} />
        <label>
          Title
          <input
            name="title"
            maxlength={180}
            value={post?.title || ""}
            placeholder="What did you discover?"
          />
        </label>
        <div class="two-columns">
          <label>
            URL slug
            <input
              name="slug"
              maxlength={120}
              value={post?.slug || ""}
              placeholder="generated-from-title"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
            />
          </label>
          <label>
            Publish date
            <input
              type="datetime-local"
              name="published_at"
              value={(post?.published_at || new Date().toISOString()).slice(
                0,
                16,
              )}
            />
            <small>UTC</small>
          </label>
        </div>
        <label>
          Description
          <textarea
            name="description"
            rows={3}
            maxlength={160}
            value={post?.description || ""}
            placeholder="A short summary for readers and search engines"
          ></textarea>
        </label>
        <fieldset>
          <legend>Tags</legend>
          <div class="tag-options">
            {tags.length ? (
              tags.map((t) => (
                <label>
                  <input
                    type="checkbox"
                    name="tags"
                    value={t.id}
                    checked={post?.tags.some((pt) => pt.id === t.id)}
                  />
                  {t.name}
                </label>
              ))
            ) : (
              <span class="muted">
                Create tags in the publishing desk first.
              </span>
            )}
          </div>
        </fieldset>
        <label class="upload">
          Import Markdown
          <input
            type="file"
            name="file"
            id="markdown-file"
            accept=".md,.markdown,text/markdown,text/plain"
          />
          <small>
            Up to 1 MiB. YAML front matter is supported. The file replaces
            editor content.
          </small>
        </label>
        <div class="editor-tabs">
          <strong>Markdown</strong>
          <button type="button" class="button secondary" id="preview-button">
            Preview ↗
          </button>
        </div>
        <label class="sr-only" for="markdown">
          Markdown source
        </label>
        <textarea
          name="markdown"
          id="markdown"
          rows={22}
          spellcheck={false}
          placeholder="# Your story starts here…"
        >
          {source}
        </textarea>
        <p id="editor-status" role="status" />
        <section
          id="preview"
          class="prose preview"
          aria-label="Markdown preview"
          hidden
        />
        <div class="form-footer">
          <label>
            Status
            <select name="status">
              <option value="draft" selected={!post || post.status === "draft"}>
                Draft
              </option>
              <option value="published" selected={post?.status === "published"}>
                Published
              </option>
            </select>
          </label>
          <button class="button" type="submit">
            Save post ↗
          </button>
        </div>
      </form>
      {post && (
        <div class="toolbar">
          <a href={`/admin/posts/${post.id}/preview`} class="text-link">
            Full-page preview ↗
          </a>
          {post.status === "published" && (
            <a href={`/posts/${post.slug}/`}>View published post ↗</a>
          )}
          <form
            action={`/admin/posts/${post.id}/delete`}
            method="post"
            data-confirm="Delete this post and its likes and comments permanently?"
          >
            <button class="text-button danger">Delete post</button>
          </form>
        </div>
      )}
    </Layout>
  );
}
