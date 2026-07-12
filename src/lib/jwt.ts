import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { RoleName } from "./roles.js";

export interface AccessTokenPayload {
  sub: number;
  email: string;
  name: string;
  roles: RoleName[];
}

export interface RefreshTokenPayload {
  sub: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(userId: number): string {
  return jwt.sign({ sub: userId } satisfies RefreshTokenPayload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRY as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}