import type { Env, Post, Tag } from "../../types";
import { Layout } from "../../views/layout";
import { Cards } from "./post-card";
export function Home({
  env,
  posts,
  tags,
  tag,
  page,
  more,
}: {
  env: Env;
  posts: Post[];
  tags: Tag[];
  tag: string;
  page: number;
  more: boolean;
}) {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  const next = `/?${new URLSearchParams({ ...(tag ? { tag } : {}), page: String(page + 1) })}`;
  return (
    <Layout
      env={env}
      title={
        tag
          ? `${tags.find((t) => t.slug === tag)?.name || tag}${page > 1 ? ` · Page ${page}` : ""}`
          : page > 1
            ? `Page ${page}`
            : undefined
      }
      path={`/${params.size ? `?${params}` : ""}`}
    >
      <section class="home-intro">
        <h1>DrStrain's blog</h1>
        <p>Application security, hacking, and notes from my own journey.</p>
      </section>
      <section id="posts" class="post-index" aria-label="Blog posts">
        <div class="section-heading">
          <h2>{tag ? `Posts tagged “${tags.find((t) => t.slug === tag)?.name || tag}”` : "Recent posts"}</h2>
        </div>
        <nav class="filters" aria-label="Filter by tag">
          <a
            class={!tag ? "active" : ""}
            href="/"
            aria-current={!tag ? "page" : undefined}
          >
            All posts
          </a>
          {tags.map((t) => (
            <a
              href={`/?tag=${t.slug}`}
              class={tag === t.slug ? "active" : ""}
              aria-current={tag === t.slug ? "page" : undefined}
            >
              {t.name}
            </a>
          ))}
        </nav>
        <div id="post-list">
          <Cards posts={posts} />
        </div>
        {!posts.length && (
          <div class="empty">
            <h2>
              {tag
                ? "No posts with this tag yet."
                : "No posts yet."}
            </h2>
            <p>
              {tag
                ? "Explore another topic using the filters above."
                : "Posts will appear here when published."}
            </p>
          </div>
        )}
        <div id="pagination" class="pagination">
          {more ? (
            <a class="button secondary" id="load-more" href={next}>
              Load more <span aria-hidden="true">↓</span>
            </a>
          ) : (
            posts.length > 0 && <span class="muted">You're all caught up.</span>
          )}
        </div>
        <p id="feed-status" role="status" class="muted" />
      </section>
    </Layout>
  );
}
