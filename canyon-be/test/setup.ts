import type { Server } from "node:http";
import { createApp } from "../src/app.js";

export const API = "/api/v1";

let server: Server | null = null;
let baseUrl = "";

export async function startTestServer() {
  if (baseUrl) return baseUrl;
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server!.address();
  const port = typeof addr === "object" && addr ? addr.port : 3001;
  baseUrl = `http://127.0.0.1:${port}`;
  return baseUrl;
}

export async function stopTestServer() {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server!.close((err) => (err ? reject(err) : resolve()));
  });
  server = null;
  baseUrl = "";
}

export async function api(
  path: string,
  options: RequestInit & { cookie?: string } = {}
) {
  const url = `${baseUrl}${API}${path}`;
  const headers = new Headers(options.headers);
  if (options.cookie) headers.set("Cookie", options.cookie);
  const { cookie: _cookie, ...rest } = options;
  return fetch(url, { ...rest, headers });
}

export async function loginAs(email: string, password: string) {
  const res = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status}`);
  }

  const data = (await res.json()) as { accessToken: string };
  const setCookie = res.headers.get("set-cookie") ?? "";
  const refreshToken = setCookie.match(/refreshToken=([^;]+)/)?.[1] ?? "";

  return {
    accessToken: data.accessToken,
    cookie: refreshToken ? `refreshToken=${refreshToken}` : "",
    authHeader: { Authorization: `Bearer ${data.accessToken}` },
  };
}