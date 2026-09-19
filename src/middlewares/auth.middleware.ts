import { getCookie, setCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";
import type { App } from "../types";
import { now, token, hash } from "../lib/crypto";
import { getSession } from "../databases/session.db";
import { incrementRateLimit } from "../databases/rate-limit.db";

export const cookieOptions = (c: Context<App>, maxAge: number) => ({
  httpOnly: true,
  secure: new URL(c.req.url).protocol === "https:",
  sameSite: "Lax" as const,
  path: "/",
  maxAge,
});

export const allowed = (c: Context<App>, sub: string) =>
  c.env.ADMIN_SUBS.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(sub);

export async function sessionUser(c: Context<App>) {
  const sid = getCookie(c, "blog_session");
  if (!sid) return null;
  const user = await getSession(c.env.DB, await hash(sid), now());
  return user && allowed(c, user.sub) ? user : null;
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

export async function rateLimit(
  c: Context<App>,
  action: string,
  max: number,
  seconds: number,
) {
  const address = c.req.header("CF-Connecting-IP") || "local";
  const key = await hash(`${action}:${address}`);
  const row = await incrementRateLimit(c.env.DB, key, now(), seconds);
  return !!row && row.count <= max;
}
