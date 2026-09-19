import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

export function validationError(error: unknown, status: 400 | 413 = 400): never {
  if (error instanceof HTTPException) throw error;
  if (error instanceof ZodError) {
    throw new HTTPException(status, {
      message: error.issues[0]?.message || "Invalid request.",
    });
  }
  throw error;
}
