import type { Child } from "hono/jsx";
import { raw } from "hono/html";
import type { Env, Post } from "../types";
export function Layout({
  env,
  title,
  description,
  path = "/",
  children,
  admin = false,
  article,
}: {
  env: Env;
  title?: string;
  description?: string;
  path?: string;
  children: Child;
  admin?: boolean;
  article?: Post;
}) {
  const canonical = new URL(path, env.SITE_URL).toString();
  const fullTitle = title ? `${title} · ${env.SITE_TITLE}` : env.SITE_TITLE;
  const schema = article
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: article.title,
        description: article.description,
        datePublished: article.published_at,
        dateModified: article.updated_at,
        mainEntityOfPage: canonical,
        author: { "@type": "Person", name: "DrStrain", url: env.SITE_URL },
        keywords: article.tags.map((t) => t.name),
      }
    : {
        "@context": "https://schema.org",
        "@type": "Blog",
        name: env.SITE_TITLE,
        description: env.SITE_DESCRIPTION,
        url: env.SITE_URL,
      };
  return (
    <>
      {raw("<!doctype html>")}
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="color-scheme" content="dark light" />
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t}catch(e){}})()`,
            }}
          />
          <title>{fullTitle}</title>
          <meta
            name="description"
            content={description || env.SITE_DESCRIPTION}
          />
          <link rel="canonical" href={canonical} />
          {admin && <meta name="robots" content="noindex,nofollow" />}
          <meta property="og:title" content={fullTitle} />
          <meta
            property="og:description"
            content={description || env.SITE_DESCRIPTION}
          />
          <meta property="og:type" content={article ? "article" : "website"} />
          <meta property="og:url" content={canonical} />
          <meta property="og:site_name" content={env.SITE_TITLE} />
          <meta name="twitter:card" content="summary" />
          {article && (
            <>
              <meta
                property="article:published_time"
                content={article.published_at}
              />
              <meta
                property="article:modified_time"
                content={article.updated_at}
              />
            </>
          )}
          <link
            rel="alternate"
            type="application/rss+xml"
            title={env.SITE_TITLE}
            href="/rss.xml"
          />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="stylesheet" href="/styles.css" />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
            }}
          />
          <script src="/app.js" defer />
        </head>
        <body>
          <a class="skip" href="#main">
            Skip to content
          </a>
          <header class="site-header wrap">
            <a class="brand" href="/">
              <span class="brand-mark">
                d<span>.</span>
              </span>
              DrStrain
            </a>
            <nav aria-label="Main navigation">
              <a href="/">Home</a>
              <a href="/#posts">Posts</a>
              {admin && <a href="/admin">Dashboard</a>}
              <span class="nav-separator" aria-hidden="true" />
              <button
                class="theme-toggle"
                type="button"
                aria-label="Switch color theme"
                title="Switch color theme"
              >
                <span class="theme-sun" aria-hidden="true">☀</span>
                <span class="theme-moon" aria-hidden="true">☾</span>
              </button>
            </nav>
          </header>
          <main id="main" class={`wrap ${admin ? "admin" : ""}`}>
            {children}
          </main>
          <footer class="wrap">
            <span>© {new Date().getUTCFullYear()} DrStrain</span>
            <div>
              <a href="https://github.com/phvietan">GitHub ↗</a>
              <a href="/rss.xml">RSS ↗</a>
            </div>
          </footer>
        </body>
      </html>
    </>
  );
}
