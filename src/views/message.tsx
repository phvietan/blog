import type { Env } from "../types";
import { Layout } from "./layout";
export function Message({
  env,
  title,
  message,
}: {
  env: Env;
  title: string;
  message: string;
}) {
  return (
    <Layout env={env} title={title}>
      <section class="empty">
        <h1>{title}</h1>
        <p>{message}</p>
        <a class="button secondary" href="/">
          Back to the journal
        </a>
      </section>
    </Layout>
  );
}
