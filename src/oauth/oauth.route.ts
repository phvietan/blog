import { Hono } from "hono";
import type { App } from "../types";
import { login, callback, logout } from "./oauth.handler";

const route = new Hono<App>();
route.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Robots-Tag", "noindex");
  await next();
});
route.get("/login", login);
route.get("/callback", callback);
route.post("/logout", logout);
export default route;
