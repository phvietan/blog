import { expect, test } from "bun:test";
import { markdown, parseMarkdown } from "../src/lib/content";

test("parses uploaded Markdown with YAML front matter and Windows line endings", () => {
  const source =
    "\uFEFF---\r\ntitle: Research notes\r\ntags: [security, web]\r\n---\r\n# Findings\r\n";
  expect(parseMarkdown(source)).toEqual({
    data: { title: "Research notes", tags: ["security", "web"] },
    body: "# Findings\r\n",
  });
});

test("preserves Markdown without front matter and rejects malformed YAML", () => {
  const source = "# Notes\n\n---\n\nA paragraph.";
  expect(parseMarkdown(source)).toEqual({ data: {}, body: source });
  expect(() => parseMarkdown("---\ntitle: [unfinished\n---\nBody")).toThrow();
});

test("renders Markdown while preserving trusted admin HTML", () => {
  const output = markdown(
    '**Research**\n\n<video controls src="/demo.mp4"></video>',
  );
  expect(output).toContain("<strong>Research</strong>");
  expect(output).toContain('<video controls src="/demo.mp4"></video>');
});
