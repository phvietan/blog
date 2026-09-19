import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  MAX_MARKDOWN,
  parseMarkdown,
  plainText,
  slugify,
} from "../lib/content";
import { validationError } from "../lib/validation";

const fileSchema = z.instanceof(File).refine(
  (file) => /\.(md|markdown)$/i.test(file.name),
  "Upload a .md or .markdown file.",
);
const sourceSchema = z.string().refine(
  (source) => new TextEncoder().encode(source).length <= MAX_MARKDOWN,
  "Markdown too large.",
);
const postSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    slug: z.string().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Use a URL slug containing lowercase letters, numbers, and hyphens.",
    }),
    description: z.string().max(300, "Keep the description under 300 characters."),
    status: z.enum(["draft", "published"], { error: "Invalid post status." }),
    published_at: z.string().transform((value, ctx) => {
      const date = new Date(/T\d\d:\d\d$/.test(value) ? `${value}:00Z` : value);
      if (Number.isNaN(date.getTime())) {
        ctx.addIssue({ code: "custom", message: "Invalid publish date." });
        return z.NEVER;
      }
      return date;
    }),
    body: z.string().trim().min(1, "Write or upload some Markdown first."),
    tags: z.array(z.coerce.number().int().positive().safe()).max(20),
  })
  .superRefine((post, ctx) => {
    if (post.status === "published" && post.published_at.getTime() > Date.now() + 60_000) {
      ctx.addIssue({
        code: "custom",
        path: ["published_at"],
        message: "Use draft for future posts; scheduled publishing is not enabled.",
      });
    }
  });
const tagSchema = z.string().trim().min(1).max(40)
  .refine((name) => slugify(name).length > 0, {
    message: "Use a tag name of 1–40 characters with letters or numbers.",
  })
  .transform((name) => ({ name, slug: slugify(name) }));

export const field = (form: FormData, key: string) => String(form.get(key) || "").trim();

export async function parsePreview(form: FormData) {
  const upload = form.get("file");
  let source: string;
  try {
    const file = upload instanceof File && upload.size ? fileSchema.parse(upload) : undefined;
    source = sourceSchema.parse(file ? await file.text() : String(form.get("markdown") || ""));
  } catch (error) {
    if (error instanceof z.ZodError && error.issues[0]?.message === "Markdown too large.") {
      validationError(error, 413);
    }
    validationError(error);
  }
  try {
    return parseMarkdown(source!);
  } catch {
    throw new HTTPException(400, { message: "Invalid YAML front matter." });
  }
}

export async function parsePost(form: FormData) {
  const { data, body } = await parsePreview(form);
  const title = field(form, "title") || String(data.title || "").trim();
  try {
    const post = postSchema.parse({
      title,
      slug: field(form, "slug") || slugify(String(data.slug || title)),
      description: field(form, "description") || String(data.description || plainText(body).slice(0, 240)),
      status: field(form, "status"),
      published_at: field(form, "published_at") || String(data.date || new Date().toISOString()),
      body,
      tags: [...new Set(form.getAll("tags").map(String))],
    });
    return { ...post, published_at: post.published_at.toISOString() };
  } catch (error) {
    validationError(error);
  }
}

export function parseTag(form: FormData) {
  try {
    return tagSchema.parse(form.get("name"));
  } catch (error) {
    validationError(error);
  }
}

export type PostDto = Awaited<ReturnType<typeof parsePost>>;
export type TagDto = ReturnType<typeof parseTag>;
