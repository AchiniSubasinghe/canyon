import { verifyPassword } from "../lib/password.js";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { signAccessToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  createRefreshToken,
  decodeRefreshCookie,
  revokeRefreshToken,
  rotateRefreshToken,
  validateRefreshToken,
} from "../services/tokens.js";
import { getUserByEmail, getUserById, getUserRoles } from "../services/users.js";

const router = Router();

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const REFRESH_COOKIE = "refreshToken";
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cookie options for the refresh token.
 *
 * Prefer same-origin access (frontend proxies /api/v1 → backend) so SameSite=Lax
 * works and Next.js middleware can read the cookie on the app domain.
 *
 * If the browser talks to the API on a different site (no proxy), set
 * COOKIE_SAME_SITE=none on the backend — browsers require Secure with None.
 */
function refreshCookieOptions() {
  const sameSite = (config.COOKIE_SAME_SITE ?? "lax") as "strict" | "lax" | "none";
  const secure =
    config.COOKIE_SECURE === "true" ||
    config.NODE_ENV === "production" ||
    sameSite === "none";

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: REFRESH_MAX_AGE_MS,
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };
}

function setRefreshCookie(res: import("express").Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

function clearRefreshCookie(res: import("express").Response) {
  const { maxAge: _maxAge, ...opts } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE, opts);
}

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await getUserByEmail(email);

    if (!user || !user.isActive) {
      throw new AppError(401, "Invalid email or password");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "Invalid email or password");
    }

    const roles = await getUserRoles(user.id);
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      roles,
    });
    const refreshToken = await createRefreshToken(user.id);

    setRefreshCookie(res, refreshToken);

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!token) {
      throw new AppError(401, "Refresh token required");
    }

    const { sub, jti } = decodeRefreshCookie(token);
    const user = await getUserById(sub);

    if (!user || !user.isActive) {
      throw new AppError(401, "Invalid refresh token");
    }

    const valid = await validateRefreshToken(jti, sub);
    if (!valid) {
      throw new AppError(401, "Invalid refresh token");
    }

    const roles = await getUserRoles(user.id);
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      roles,
    });
    const newRefreshToken = await rotateRefreshToken(jti, user.id);

    setRefreshCookie(res, newRefreshToken);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (token) {
      try {
        const { jti } = decodeRefreshCookie(token);
        await revokeRefreshToken(jti);
      } catch {
        // ignore invalid cookie on logout
      }
    }
    clearRefreshCookie(res);
    res.json({ message: "Logged out" });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.user!.id);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    const roles = await getUserRoles(user.id);
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      roles,
    });
  } catch (err) {
    next(err);
  }
});

export default router;