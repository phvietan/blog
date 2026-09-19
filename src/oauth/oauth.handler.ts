import type { Handler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { App } from "../types";
import { now, token, hash } from "../lib/crypto";
import {
  cookieOptions,
  allowed,
  rateLimit,
} from "../middlewares/auth.middleware";
import { createSession, deleteSession } from "../databases/session.db";
import {
  oauthProfileSchema,
  oauthTokensSchema,
  parseCallback,
} from "./oauth.dto";
export const login: Handler<App> = async (c) => {
  if (
    !c.env.OAUTH_SECRET ||
    !c.env.ADMIN_SUBS ||
    c.env.OAUTH_CLIENT_ID.startsWith("configure-")
  )
    return c.text(
      "Configure the blog OAuth client and ADMIN_SUBS before signing in. See README.md.",
      503,
    );
  if (!(await rateLimit(c, "login", 20, 600)))
    return c.text("Please try again later.", 429);
  const state = token();
  setCookie(c, "blog_oauth_state", state, cookieOptions(c, 600));
  const url = new URL("/oauth/authorize", c.env.OAUTH_ISSUER);
  url.search = new URLSearchParams({
    client_id: c.env.OAUTH_CLIENT_ID,
    redirect_uri: c.env.OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: "profile:read",
    state,
  }).toString();
  return c.redirect(url.toString());
};
export const callback: Handler<App> = async (c) => {
  const { state, code } = parseCallback(c.req.query());
  if (!state || !code || state !== getCookie(c, "blog_oauth_state"))
    return c.text("Invalid OAuth state. Start sign-in again.", 400);
  deleteCookie(c, "blog_oauth_state", { path: "/" });
  try {
    const response = await fetch(new URL("/oauth/token", c.env.OAUTH_ISSUER), {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: c.env.OAUTH_REDIRECT_URI,
        client_id: c.env.OAUTH_CLIENT_ID,
        client_secret: c.env.OAUTH_SECRET,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Token exchange failed");
    const tokens = oauthTokensSchema.parse(await response.json());
    const profileResponse = await fetch(
      new URL("/oauth/profile:read", c.env.OAUTH_ISSUER),
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!profileResponse.ok) throw new Error("Profile request failed");
    const profile = oauthProfileSchema.parse(await profileResponse.json());
    if (!allowed(c, profile.sub))
      return c.text("This SSO account is not a blog administrator.", 403);
    const sid = token();
    await createSession(
      c.env.DB,
      await hash(sid),
      { sub: profile.sub, name: profile.name || "Admin" },
      now() + 604800,
    );
    setCookie(c, "blog_session", sid, cookieOptions(c, 604800));
    return c.redirect("/admin");
  } catch {
    return c.text("SSO sign-in failed. Please start again.", 502);
  }
};
export const logout: Handler<App> = async (c) => {
  const sid = getCookie(c, "blog_session");
  if (sid) await deleteSession(c.env.DB, await hash(sid));
  deleteCookie(c, "blog_session", { path: "/" });
  return c.redirect("/");
};
