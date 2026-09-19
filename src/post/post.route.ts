import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { App } from "../types";
import * as handler from "./post.handler";

const route = new Hono<App>();
route.get("/", handler.home);
route.get("/api/posts", handler.feed);
route.get("/posts", handler.redirectIndex);
route.get("/posts/", handler.redirectIndex);
route.get("/posts/:slug", handler.canonicalPost);
route.get("/posts/:slug/", handler.article);
route.post(
  "/posts/:slug/like",
  bodyLimit({
    maxSize: 16384,
    onError: (c) => c.text("Request too large.", 413),
  }),
  handler.like,
);
export default route;
