import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { RoleName } from "./roles.js";
import { ROLE_NAMES } from "./roles.js";

export interface AccessTokenPayload {
  sub: number;
  email: string;
  name: string;
  roles: RoleName[];
}

export interface RefreshTokenPayload {
  sub: number;
  jti: string;
}

function decodePayload(token: string, secret: string): jwt.JwtPayload {
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === "string" || !decoded || typeof decoded !== "object") {
    throw new Error("Invalid token");
  }
  return decoded;
}

function toUserId(sub: unknown): number {
  const id = typeof sub === "string" ? Number(sub) : sub;
  if (typeof id !== "number" || Number.isNaN(id)) {
    throw new Error("Invalid token subject");
  }
  return id;
}

function isRoleName(value: unknown): value is RoleName {
  return typeof value === "string" && ROLE_NAMES.includes(value as RoleName);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(userId: number, jti: string): string {
  return jwt.sign({ sub: userId, jti } satisfies RefreshTokenPayload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRY as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = decodePayload(token, config.JWT_ACCESS_SECRET);
  const { email, name, roles } = decoded;

  if (typeof email !== "string" || typeof name !== "string" || !Array.isArray(roles)) {
    throw new Error("Invalid access token payload");
  }

  if (!roles.every(isRoleName)) {
    throw new Error("Invalid access token roles");
  }

  return {
    sub: toUserId(decoded.sub),
    email,
    name,
    roles,
  };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = decodePayload(token, config.JWT_REFRESH_SECRET);
  const { jti } = decoded;
  if (typeof jti !== "string" || !jti) {
    throw new Error("Invalid refresh token jti");
  }
  return { sub: toUserId(decoded.sub), jti };
}