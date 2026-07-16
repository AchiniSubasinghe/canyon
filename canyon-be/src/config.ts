import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().default("canyon"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  /**
   * Refresh cookie SameSite. Use "lax" (default) when the frontend proxies the API
   * on the same origin. Use "none" only if the browser calls the API cross-site.
   */
  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  /** Force Secure on the refresh cookie ("true" / "false"). Defaults to on in production. */
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  /** Cookie domain for sharing cookies across subdomains (e.g. .achini.space) */
  COOKIE_DOMAIN: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().min(1, "DEEPSEEK_API_KEY is required for the Canyon Agent"),
});

export const config = envSchema.parse(process.env);