import { marked } from "marked";
import { parse } from "yaml";

export const MAX_MARKDOWN = 1024 * 1024;
export function markdown(source: string) {
  // Post authors are trusted administrators; comments never pass through this renderer.
  return marked.parse(source, { async: false, gfm: true });
}
export function parseMarkdown(source: string) {
  const match = source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const data = match ? parse(match[1], { maxAliasCount: 20 }) : {};
  return {
    data: (data && typeof data === "object" ? data : {}) as Record<
      string,
      unknown
    >,
    body: match ? source.slice(match[0].length) : source,
  };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

export const validSlug = (s: string) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 120;

export const xml = (s: unknown) =>
  String(s).replace(
    /[<>&"']/g,
    (x) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[x]!,
  );

export const plainText = (source: string) =>
  markdown(source)
    .replace(/<[^>]*>/g, " ")
    .replace(
      /&(?:amp|lt|gt|quot|#39);/g,
      (s) =>
        ({
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&quot;": '"',
          "&#39;": "'",
        })[s] || s,
    )
    .replace(/\s+/g, " ")
    .trim();

export const minutes = (source: string) =>
  Math.max(1, Math.ceil(source.trim().split(/\s+/).length / 220));
