import { z } from "zod";

const callbackSchema = z.object({
  state: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
});
export const oauthTokensSchema = z.object({ access_token: z.string().min(1) });
export const oauthProfileSchema = z.object({
  sub: z.string().min(1),
  name: z.string().optional(),
});

export function parseCallback(query: Record<string, string>) {
  return callbackSchema.parse(query);
}
export type OAuthTokens = z.infer<typeof oauthTokensSchema>;
export type OAuthProfile = z.infer<typeof oauthProfileSchema>;
