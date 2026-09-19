import type { Env, Post } from "../../types";
import { Layout } from "../../views/layout";

export function Preview({
  env,
  post,
  html,
}: {
  env: Env;
  post: Post;
  html: string;
}) {
  return (
    <Layout env={env} title={`Preview: ${post.title}`} admin>
      <article class="article">
        <a class="back" href={`/admin/posts/${post.id}`}>
          ← Back to editor
        </a>
        <h1>{post.title}</h1>
        <div class="prose" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </Layout>
  );
}
