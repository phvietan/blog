import { z } from "zod";

const pageSchema = z.coerce
  .number()
  .finite()
  .transform((page) => Math.max(1, Math.min(100_000, Math.floor(page))));
const feedSchema = z.object({
  page: pageSchema.catch(1),
  tag: z.string().catch(""),
});

export const pageNumber = (value?: string) => pageSchema.catch(1).parse(value);
export function parseFeed(query: Record<string, string>) {
  return feedSchema.parse(query);
}
export type FeedDto = z.infer<typeof feedSchema>;
