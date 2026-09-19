import type { MiddlewareHandler, NotFoundHandler, ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { App } from "../types";
import { Message } from "../views/message";

export const securityHeaders: MiddlewareHandler<App> = async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    if (c.req.header("Origin") !== new URL(c.req.url).origin)
      return c.text("Cross-origin request rejected.", 403);
    c.header("Cache-Control", "no-store");
  }
  await next();
};
export const notFound: NotFoundHandler<App> = (c) =>
  c.html(
    Message({
      env: c.env,
      title: "Page not found",
      message: "This page may have moved, or the story is still being written.",
    }),
    404,
  );
export const onError: ErrorHandler<App> = (error, c) => {
  if (error instanceof HTTPException)
    return c.text(error.message, error.status);
  console.error("Request failed", error.message);
  return c.html(
    Message({
      env: c.env,
      title: "Something went wrong",
      message: "Please try again shortly. Your existing posts are safe.",
    }),
    500,
  );
};
