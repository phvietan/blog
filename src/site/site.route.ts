import { Hono } from "hono";
import type { App } from "../types";
import * as handler from "./site.handler";

const route = new Hono<App>();
route.get("/sitemap.xml", handler.sitemap);
route.get("/rss.xml", handler.rss);
route.get("/index.xml", handler.legacyRss);
route.get("/robots.txt", handler.robots);
route.get("/llms.txt", handler.llms);
route.get("*", handler.assets);
export default route;
