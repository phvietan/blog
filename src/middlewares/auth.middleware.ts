import { getCookie, setCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";
import type { App } from "../types";
import { now, token, hash } from "../lib/crypto";
import { getSession } from "../databases/session.db";

export const cookieOptions = (c: Context<App>, maxAge: number) => ({
  httpOnly: true,
  secure: new URL(c.req.url).protocol === "https:",
  sameSite: "Lax" as const,
  path: "/",
  maxAge,
});

export const allowed = (c: Context<App>, email: string) =>
  c.env.ADMIN_EMAILS.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());

export async function sessionUser(c: Context<App>) {
  const sid = getCookie(c, "blog_session");
  if (!sid) return null;
  const user = await getSession(c.env.DB, await hash(sid), now());
  return user && allowed(c, user.email) ? user : null;
}

export const requireAdmin: MiddlewareHandler<App> = async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex, nofollow");
  const user = await sessionUser(c);
  if (!user)
    return c.req.method === "GET"
      ? c.redirect("/oauth2/login")
      : c.text("Sign in required.", 401);
  c.set("user", user);
  await next();
};

export async function visitor(c: Context<App>) {
  let id = getCookie(c, "blog_visitor");
  if (!id || !/^[a-f0-9]{64}$/.test(id)) {
    id = token();
    setCookie(c, "blog_visitor", id, cookieOptions(c, 31536000));
  }
  return hash(id);
}
