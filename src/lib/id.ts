import { HTTPException } from 'hono/http-exception';
import { z } from "zod";

const idSchema = z.coerce.number().int().positive().safe();

export function parseId(value: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new HTTPException(400, {message:'Invalid ID.'});
  }
  const result = idSchema.safeParse(value);
  if (!result.success) throw new HTTPException(400, { message: "Invalid ID." });
  return result.data;
}
