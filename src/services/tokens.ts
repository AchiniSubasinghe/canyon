import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/index.js";
import { refreshTokens } from "../db/schema.js";
import { signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";

const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function createRefreshToken(userId: number): Promise<string> {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_MAX_AGE_MS);

  await db.insert(refreshTokens).values({
    userId,
    jti,
    expiresAt,
  });

  return signRefreshToken(userId, jti);
}

export async function validateRefreshToken(
  jti: string,
  userId: number
): Promise<boolean> {
  const [row] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.jti, jti),
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt)
      )
    )
    .limit(1);

  if (!row) return false;
  return row.expiresAt.getTime() > Date.now();
}

export async function revokeRefreshToken(jti: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.jti, jti), isNull(refreshTokens.revokedAt)));
}

export async function revokeAllUserTokens(userId: number): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}

export async function rotateRefreshToken(oldJti: string, userId: number): Promise<string> {
  await revokeRefreshToken(oldJti);
  return createRefreshToken(userId);
}

export function decodeRefreshCookie(token: string): { sub: number; jti: string } {
  return verifyRefreshToken(token);
}