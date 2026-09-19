import { Hono } from "hono";
import type { App } from "./types";
import admin from "./admin/admin.route";
import oauth from "./oauth/oauth.route";
import post from "./post/post.route";
import comment from "./comment/comment.route";
import site from "./site/site.route";
import {
  securityHeaders,
  notFound,
  onError,
} from "./middlewares/http.middleware";
import { scheduled } from "./jobs/maintenance";

export const app = new Hono<App>();
app.use("*", securityHeaders);
app.route("/oauth2", oauth);
app.route("/admin", admin);
app.route("/", post);
app.route("/", comment);
app.route("/", site);
app.notFound(notFound);
app.onError(onError);
export default { fetch: app.fetch, scheduled };
