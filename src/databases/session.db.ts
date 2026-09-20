import type { User } from "../types";

export function createSession(
  db: D1Database,
  tokenHash: string,
  user: User,
  expiresAt: number,
) {
  return db
    .prepare(
      "INSERT INTO sessions(token_hash,sub,name,email,expires_at) VALUES(?,?,?,?,?)",
    )
    .bind(tokenHash, user.sub, user.name, user.email, expiresAt)
    .run();
}
export function getSession(db: D1Database, tokenHash: string, now: number) {
  return db
    .prepare(
      "SELECT sub,name,email FROM sessions WHERE token_hash=? AND expires_at>?",
    )
    .bind(tokenHash, now)
    .first<User>();
}
export function updateSessionExpiry(
  db: D1Database,
  tokenHash: string,
  expiresAt: number,
) {
  return db
    .prepare("UPDATE sessions SET expires_at=? WHERE token_hash=?")
    .bind(expiresAt, tokenHash)
    .run();
}
export function deleteSession(db: D1Database, tokenHash: string) {
  return db
    .prepare("DELETE FROM sessions WHERE token_hash=?")
    .bind(tokenHash)
    .run();
}
export function deleteExpiredSessions(db: D1Database, now: number) {
  return db.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now).run();
}
