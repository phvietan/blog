import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { App } from "../types";
import { requireAdmin } from "../middlewares/auth.middleware";
import { MAX_MARKDOWN } from "../lib/content";
import * as handler from "./admin.handler";

const route = new Hono<App>();
route.use("*", requireAdmin);
route.use(
  "*",
  bodyLimit({
    maxSize: MAX_MARKDOWN + 65536,
    onError: (c) => c.text("Markdown must be no larger than 1 MiB.", 413),
  }),
);
route.get("/", handler.dashboard);
route.get("/posts/new", handler.newPost);
route.get("/posts/:id", handler.editPost);
route.get("/posts/:id/preview", handler.previewPost);
route.post("/preview", handler.previewMarkdown);
route.post("/posts", handler.savePost);
route.post("/posts/:id", handler.savePost);
route.post("/posts/:id/delete", handler.deletePost);
route.post("/tags", handler.createTag);
route.post("/tags/:id/delete", handler.deleteTag);
route.post("/comments/:id/approve", handler.approveComment);
route.post("/comments/:id/delete", handler.deleteComment);
export default route;
