import {
  readdir,
  readFile,
  mkdtemp,
  writeFile,
  rm,
  cp,
  mkdir,
} from "node:fs/promises";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { excerpt, parseMarkdown, minutes, slugify } from "../src/lib/content";

// Local only. Restore missing import objects, but never overwrite editor changes.
if (process.argv.includes("--remote"))
  throw new Error("This importer only writes local development data.");
const source = process.argv[2] || "legacy-blog";
const run = (...args: string[]) =>
  execFileSync("node", ["node_modules/wrangler/bin/wrangler.js", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
const quote = (value: unknown) => `'${String(value).replace(/'/g, "''")}'`;
const temp = await mkdtemp(join(tmpdir(), "blog-import-"));
try {
  console.log(run("d1", "migrations", "apply", "DB", "--local"));
  const existing = JSON.parse(
    run(
      "d1",
      "execute",
      "DB",
      "--local",
      "--command",
      "SELECT slug,r2_key FROM posts",
      "--json",
    ),
  ) as { results: { slug: string; r2_key: string }[] }[];
  const posts = new Map(
    existing.flatMap((r) => r.results.map((p) => [p.slug, p] as const)),
  );
  let count = 0;
  let restored = 0;
  for (const name of await readdir(join(source, "content/posts"))) {
    if (!name.endsWith(".md")) continue;
    const { data, body } = parseMarkdown(
      await readFile(join(source, "content/posts", name), "utf8"),
    );
    const slug = slugify(String(data.slug || basename(name, ".md")));
    const previous = posts.get(slug);
    if (previous) {
      if (!previous.r2_key.endsWith("/import.md")) {
        console.log(`Skipping edited /posts/${slug}/`);
        continue;
      }
      try {
        run(
          "r2",
          "object",
          "get",
          `phvietan-blog/${previous.r2_key}`,
          "--local",
          "--file",
          join(temp, "existing.md"),
        );
        console.log(`Skipping existing /posts/${slug}/`);
        continue;
      } catch (error) {
        const output = String((error as { stderr?: unknown }).stderr || "");
        if (!output.includes("The specified key does not exist")) throw error;
      }
    }
    const key = previous?.r2_key || `posts/imports/${slug}/import.md`;
    const title = String(data.title || slug);
    const date = new Date(
      String(data.date || new Date().toISOString()),
    ).toISOString();
    const file = join(temp, "post.md");
    await writeFile(file, body);
    run(
      "r2",
      "object",
      "put",
      `phvietan-blog/${key}`,
      "--local",
      "--file",
      file,
      "--content-type",
      "text/markdown; charset=utf-8",
    );
    // Confirm persistence before creating metadata that points to this object.
    run(
      "r2",
      "object",
      "get",
      `phvietan-blog/${key}`,
      "--local",
      "--file",
      join(temp, "saved.md"),
    );
    if ((await readFile(join(temp, "saved.md"), "utf8")) !== body) {
      throw new Error(`Stored Markdown did not match /posts/${slug}/`);
    }
    if (previous) {
      restored++;
      console.log(`Restored Markdown for /posts/${slug}/`);
      continue;
    }
    const sql = [
      `INSERT INTO posts(slug,title,description,r2_key,status,published_at,updated_at,reading_minutes) VALUES(${[slug, title, excerpt(String(data.description || body)), key, data.draft === true ? "draft" : "published", date, date, minutes(body)].map(quote).join(",")});`,
    ];
    for (const name of Array.isArray(data.tags) ? data.tags.map(String) : []) {
      const tagSlug = slugify(name);
      if (!tagSlug) continue;
      sql.push(
        `INSERT INTO tags(name,slug) VALUES(${quote(name)},${quote(tagSlug)}) ON CONFLICT DO NOTHING;`,
      );
      sql.push(
        `INSERT INTO post_tags(post_id,tag_id) SELECT p.id,t.id FROM posts p,tags t WHERE p.slug=${quote(slug)} AND t.slug=${quote(tagSlug)};`,
      );
    }
    const sqlFile = join(temp, "post.sql");
    await writeFile(sqlFile, sql.join("\n"));
    run("d1", "execute", "DB", "--local", "--file", sqlFile);
    count++;
    console.log(`Imported /posts/${slug}/`);
  }
  await mkdir("public/legacy", { recursive: true });
  await cp(join(source, "static"), "public/legacy", { recursive: true });
  console.log(
    `Imported ${count} posts; restored ${restored} missing Markdown files in local R2; copied static assets. Run bun dev.`,
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
