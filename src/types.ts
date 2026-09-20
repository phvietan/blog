export type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS: Fetcher;
  EMAIL: {
    send(message: {
      from: string;
      to: string;
      subject: string;
      text?: string;
      html?: string;
    }): Promise<unknown>;
  };
  EMAIL_FROM: string;
  EMAIL_TO: string;
  SITE_URL: string;
  SITE_TITLE: string;
  SITE_DESCRIPTION: string;
  OAUTH_ISSUER: string;
  OAUTH_CLIENT_ID: string;
  OAUTH_SECRET: string;
  OAUTH_REDIRECT_URI: string;
  ADMIN_EMAILS: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
};
export type User = { sub: string; name: string; email: string };
export type App = { Bindings: Env; Variables: { user: User; visitor: string } };
export type Tag = { id: number; name: string; slug: string };
export type Post = {
  id: number;
  slug: string;
  title: string;
  description: string;
  r2_key: string;
  status: "draft" | "published";
  published_at: string;
  updated_at: string;
  views: number;
  reading_minutes: number;
  likes: number;
  tags: Tag[];
};
export type Comment = {
  id: number;
  name: string;
  body: string;
  created_at: number;
  status: string;
  comment_id: number | null;
  parent_name?: string;
  is_admin: number;
  author_sub: string | null;
  title?: string;
};
