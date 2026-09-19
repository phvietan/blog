import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { App } from "../types";
import { submitComment } from "./comment.handler";

const route = new Hono<App>();
route.post(
  "/posts/:slug/comments",
  bodyLimit({
    maxSize: 16384,
    onError: (c) => c.text("Request too large.", 413),
  }),
  submitComment,
);
export default route;
