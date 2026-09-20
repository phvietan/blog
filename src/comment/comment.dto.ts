import { z } from "zod";
import { validationError } from "../lib/validation";

const commentSchema = z.object({
  body: z.string().trim().min(2, "Comments must contain 2–4,000 characters.")
    .max(4_000, "Comments must contain 2–4,000 characters."),
  name: z.string().trim().max(60, "Keep your name under 60 characters."),
  website: z.literal("", { error: "Comment rejected." }),
  comment_id: z.union([z.literal(""), z.coerce.number().int().positive().safe()])
    .transform((id) => id || null),
});

export function parseComment(form: FormData, adminName?: string) {
  try {
    const comment = commentSchema.parse({
      body: form.get("body"),
      name: adminName || form.get("name") || "Anonymous",
      website: form.get("website") || "",
      comment_id: form.get("comment_id") || "",
    });
    return { ...comment, name: comment.name || "Anonymous" };
  } catch (error) {
    validationError(error);
  }
}

export function parseCommentBody(form: FormData) {
  try {
    return commentSchema.shape.body.parse(form.get("body"));
  } catch (error) {
    validationError(error);
  }
}

export type CommentDto = ReturnType<typeof parseComment>;
