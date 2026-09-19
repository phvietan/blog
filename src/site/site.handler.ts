import type { Handler } from "hono";
import type { App } from "../types";
import { listPublishedPosts } from "../databases/post.db";
import { xml } from "../lib/content";
export const sitemap: Handler<App> = async (c) => {
  const posts = await listPublishedPosts(c.env.DB);
  const base = c.env.SITE_URL.replace(/\/$/, "");
  c.header("Content-Type", "application/xml; charset=utf-8");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xml(base)}/</loc></url>${posts.map((p) => `<url><loc>${xml(base)}/posts/${xml(p.slug)}/</loc><lastmod>${xml(p.updated_at)}</lastmod></url>`).join("")}</urlset>`,
  );
};
export const rss: Handler<App> = async (c) => {
  const posts = await listPublishedPosts(c.env.DB, 50);
  const base = c.env.SITE_URL.replace(/\/$/, "");
  c.header("Content-Type", "application/rss+xml; charset=utf-8");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(c.env.SITE_TITLE)}</title><link>${xml(base)}/</link><description>${xml(c.env.SITE_DESCRIPTION)}</description><language>en</language><atom:link href="${xml(base)}/rss.xml" rel="self" type="application/rss+xml"/>${posts.map((p) => `<item><title>${xml(p.title)}</title><link>${xml(base)}/posts/${xml(p.slug)}/</link><guid>${xml(base)}/posts/${xml(p.slug)}/</guid><pubDate>${new Date(p.published_at).toUTCString()}</pubDate><description>${xml(p.description)}</description></item>`).join("")}</channel></rss>`,
  );
};
export const llms: Handler<App> = async (c) => {
  const posts = await listPublishedPosts(c.env.DB);
  return c.text(
    `# ${c.env.SITE_TITLE}\n\n${c.env.SITE_DESCRIPTION}\n\n## Posts\n${posts.map((p) => `- [${p.title.replace(/[\r\n\[\]]/g, " ")}](${new URL(`/posts/${p.slug}/`, c.env.SITE_URL)}): ${p.description.replace(/[\r\n]/g, " ")}`).join("\n")}`,
  );
};
export const assets: Handler<App> = async (c) => {
  const response = await c.env.ASSETS.fetch(c.req.raw);
  if (response.status !== 404) return response;
  // Preserve the Hugo blog's original static asset URLs after importing.
  const legacyURL = new URL(c.req.url);
  legacyURL.pathname = `/legacy${legacyURL.pathname}`;
  const legacy = await c.env.ASSETS.fetch(new Request(legacyURL, c.req.raw));
  return legacy.status !== 404 ? legacy : c.notFound();
};

export const legacyRss: Handler<App> = (c) => c.redirect("/rss.xml", 301);
export const robots: Handler<App> = (c) =>
  c.text(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /oauth2/\nDisallow: /api/\nSitemap: ${new URL("/sitemap.xml", c.env.SITE_URL)}\n`,
  );
