import type { Post, Tag } from "../../types";
import { date } from "../../lib/date";
export function Tags({ tags }: { tags: Tag[] }) {
  return (
    <div class="tags">
      {tags.map((t) => (
        <a href={`/?tag=${encodeURIComponent(t.slug)}`} class="tag">
          {t.name}
        </a>
      ))}
    </div>
  );
}
export function Cards({ posts }: { posts: Post[] }) {
  return (
    <>
      {posts.map((p) => (
        <article class="post-card">
          <h2>
            <a href={`/posts/${p.slug}/`}>
              <span>{p.title}</span>
              <time datetime={p.published_at}>{date(p.published_at)}</time>
            </a>
          </h2>
          <div class="card-bottom">
            <Tags tags={p.tags} />
            <span class="post-reading-time">{p.reading_minutes} min read</span>
          </div>
        </article>
      ))}
    </>
  );
}
