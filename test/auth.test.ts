import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, loginAs, startTestServer, stopTestServer } from "./setup.js";

beforeAll(async () => {
  await startTestServer();
});

afterAll(async () => {
  await stopTestServer();
});

describe("auth", () => {
  test("login returns access token and sets refresh cookie", async () => {
    const session = await loginAs("admin@canyon.local", "Admin123!");
    expect(session.accessToken).toBeTruthy();
    expect(session.cookie).toContain("refreshToken=");
  });

  test("refresh rotates token and old token is revoked", async () => {
    const session = await loginAs("admin@canyon.local", "Admin123!");

    const refreshRes = await api("/auth/refresh", {
      method: "POST",
      headers: { Cookie: session.cookie },
    });
    expect(refreshRes.status).toBe(200);

    const oldRefresh = await api("/auth/refresh", {
      method: "POST",
      headers: { Cookie: session.cookie },
    });
    expect(oldRefresh.status).toBe(401);
  });

  test("logout revokes refresh token", async () => {
    const session = await loginAs("admin@canyon.local", "Admin123!");

    const logoutRes = await api("/auth/logout", {
      method: "POST",
      headers: { ...session.authHeader, Cookie: session.cookie },
    });
    expect(logoutRes.status).toBe(200);

    const refreshRes = await api("/auth/refresh", {
      method: "POST",
      headers: { Cookie: session.cookie },
    });
    expect(refreshRes.status).toBe(401);
  });
});