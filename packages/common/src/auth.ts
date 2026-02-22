import { encodeHexLowerCase } from "@oslojs/encoding";
import {
  authSessions,
  users,
  type AuthSession,
  type User,
} from "@czqm/db/schema";
import { sha256 } from "@oslojs/crypto/sha2";
import type { DB } from "./db";
import { eq } from "drizzle-orm";

export type SessionValidationResult =
  | { session: AuthSession; user: User }
  | { session: null; user: null };

export async function validateSessionToken(
  db: DB,
  token: string,
): Promise<SessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const result = await db
    .select({ user: users, session: authSessions })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.cid))
    .where(eq(authSessions.id, sessionId));
  if (result.length < 1) {
    return { session: null, user: null };
  }
  const { user, session } = result[0];
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(authSessions).where(eq(authSessions.id, session.id));
    return { session: null, user: null };
  }
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db
      .update(authSessions)
      .set({
        expiresAt: session.expiresAt,
      })
      .where(eq(authSessions.id, session.id));
  }
  return { session, user };
}
