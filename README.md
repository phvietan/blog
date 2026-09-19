# DrStrain's blog

A Cloudflare Worker written in TypeScript with Hono JSX server rendering, Bun tooling, R2 Markdown storage, and D1 for posts, tags, sessions, likes, comments, and email retries. The existing Hugo blog is kept in `drstrain-blog/`.

## Source layout

- `src/admin/`: admin routes, input DTOs, handlers, and dashboard/editor views.
- `src/post/`: public post routes, query DTOs, handlers, and reader views.
- `src/comment/`: comment routes, input DTOs, handlers, and email delivery.
- `src/oauth/`: OAuth routes, DTOs, and login/callback/logout handlers.
- `src/databases/`: per-table database functions (`post.db.ts`, `tag.db.ts`, `comment.db.ts`, etc.). SQL stays here; post/tag writes and comment/email writes remain transactional.
- `src/site/`: sitemap, RSS, robots, Markdown index, and static asset handlers.
- `src/middlewares/`, `src/lib/`, `src/views/`, `src/jobs/`: shared middleware, helpers, page layouts, and scheduled maintenance.
- `src/index.ts`: application wiring and Worker entry point.

Route files register middleware and endpoints. DTOs parse and validate inputs. Handlers coordinate database/storage operations and render views. Database modules expose CRUD or lifecycle operations appropriate to each table.

## Local development

```sh
nvm use # Node 22 for Wrangler; Bun still manages packages and scripts
bun install
bun run db:local
cp .dev.vars.example .dev.vars
bun dev
```

Visit `http://localhost:8787`. Local D1 and R2 use `.wrangler/state`. No Cloudflare credentials are needed for local storage. Public pages work before SSO is configured. To preview the existing Hugo posts and their assets:

```sh
bun run import:local
```

The importer is local-only. It skips existing posts with stored Markdown and restores missing R2 files for unchanged imports without overwriting editor changes. It verifies that each Markdown object was stored before creating D1 metadata. It preserves `/posts/<slug>/` URLs, dates, drafts, YAML tags, and original asset URLs. Static files are copied to the ignored `public/legacy/` directory. Re-running the importer restores these files on another checkout. Uploading a Markdown file in the editor also supports YAML front matter; explicit form fields take precedence. Create/select tags in the admin panel.

```sh
bun run check  # TypeScript
bun test       # Lightweight content helper unit tests
bun run build # Worker deployment dry run
```

Bun manages packages and scripts. Wrangler runs under Node 22+ as recommended by [Cloudflare](https://developers.cloudflare.com/workers/wrangler/install-and-update/). Run `nvm use` to select the version in `.nvmrc`; forcing Wrangler through `bun --bun` can stall the local server.

## SSO and admin access

The flow matches `../r2-admin/` and `../sso/`: `/oauth/authorize`, `/oauth/token`, then `/oauth/profile:read`. OAuth state is checked with a short-lived HTTP-only cookie. Login sessions are stored in **D1**, with no KV binding. `/admin` starts SSO sign-in. Sessions last seven days; the cron removes expired records.

1. Register a dedicated confidential OAuth client in your SSO admin. Allow `profile:read` and register `http://localhost:8787/oauth2/callback` for development and your production callback URL.
2. Set `OAUTH_CLIENT_ID`, `OAUTH_SECRET`, and `OAUTH_REDIRECT_URI` in `.dev.vars`. The issuer is `https://sso.drstra.in`.
3. Set `ADMIN_SUBS` to a comma-separated list of SSO profile `sub` IDs allowed to administer this blog. An empty list grants nobody access. It is checked on every admin request and before treating a comment as an admin comment.

Post authors are trusted administrators. Markdown supports raw HTML, including your existing images, video, and custom markup. Public comments are always JSX-escaped plain text. Requests that change data require a matching browser Origin.

## Publishing and reading

- `/admin`: create tags, manage posts, approve/delete comments.
- Editor: upload `.md` or `.markdown` (up to 1 MiB), edit Markdown, preview, save drafts, or publish. Select multiple tags. Publication dates are UTC; scheduling is not implemented.
- Public index: ten posts per page, tag filtering, automatic loading on scroll, and crawlable pagination links that work without JavaScript.
- Post pages: SSR content and approved comments, atomic public view count, anonymous likes, and anonymous comments/replies. Views count HTML requests, including refreshes and crawlers; they are not unique visitors. HEAD requests do not count.
- Likes are idempotent per post and anonymous browser cookie. Clearing cookies or using another browser permits another like. IP-based request limits reduce casual abuse.
- Comments accept an optional `comment_id` pointing to an approved comment on the same post. The UI shows the parent and a reply link. Anonymous comments await moderation; authenticated admin comments publish immediately and show an Author badge. Comments are paginated in groups of 50, with direct links that locate the correct page.
- SEO: canonical URLs, Open Graph/Twitter metadata, BlogPosting JSON-LD, `/sitemap.xml`, `/rss.xml`, `/robots.txt`, and `/llms.txt`. `/index.xml` redirects to RSS. Drafts are excluded from all public routes and feeds. No client-side rendering is required to read a post.

## Comment notification email

Uses the same structured `EMAIL.send({ to, from, subject, html })` binding as `../sso/src/lib/email.ts`, with a plain-text alternative. Every accepted **non-admin** comment or reply queues an email to `EMAIL_TO`, including pending comments. Admin identity comes from the D1 session, never a submitted name or form flag.

Set `EMAIL_FROM` to a sender enabled in your Cloudflare Email Service account (for example, the existing `noreply@sso.drstra.in` sender), and set `EMAIL_TO` to the verified destination address. Enable Email Routing/Email Service for the sender domain. See [Cloudflare send bindings](https://developers.cloudflare.com/email-service/configuration/send-bindings/) and [Workers email API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/).

Comment insertion and outbox insertion are one D1 transaction. Delivery is attempted immediately in `waitUntil`; a five-minute cron retries failures with backoff. Comments remain saved if mail delivery fails. Delivery is at least once: a process failure after sending but before recording success can cause a duplicate notification. Local development uses simulated email; it does not send real mail.

## Production setup

The checked-in database ID and OAuth client ID are placeholders. No remote resources are created by local commands.

```sh
bunx wrangler d1 create drstrain-blog
bunx wrangler r2 bucket create drstrain-blog
```

Put the returned D1 ID in `wrangler.jsonc`; set `SITE_URL`, the OAuth client ID and callback, `ADMIN_SUBS`, `EMAIL_FROM`, and `EMAIL_TO`. Configure the email sender/destination above, then:

```sh
bunx wrangler secret put OAUTH_SECRET
bun run db:remote
bun run deploy
```

Attach `blog.drstra.in` as a custom domain for the Worker, and register its exact callback (`https://blog.drstra.in/oauth2/callback`) in SSO. Existing Hugo content is not automatically uploaded to production: publish it through the admin Markdown upload. If keeping the Hugo assets, run the local importer before deploying so `public/legacy/` is included. Never reuse the R2 admin application's OAuth secret or D1/R2 bindings.
