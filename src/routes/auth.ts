import { verifyPassword } from "../lib/password.js";
import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { getUserByEmail, getUserById, getUserRoles } from "../services/users.js";

const router = Router();

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

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
    const refreshToken = signRefreshToken(user.id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

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
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      throw new AppError(401, "Refresh token required");
    }

    const payload = verifyRefreshToken(token);
    const user = await getUserById(payload.sub);

    if (!user || !user.isActive) {
      throw new AppError(401, "Invalid refresh token");
    }

    const roles = await getUserRoles(user.id);
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      roles,
    });

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", requireAuth, (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out" });
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