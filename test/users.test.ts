import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, loginAs, startTestServer, stopTestServer } from "./setup.js";

beforeAll(async () => {
  await startTestServer();
});

afterAll(async () => {
  await stopTestServer();
});

describe("users", () => {
  test("GET /users returns paginated response", async () => {
    const admin = await loginAs("admin@canyon.local", "Admin123!");
    const res = await api("/users?limit=10&offset=0", { headers: admin.authHeader });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: unknown[]; total: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.total).toBe("number");
  });

  test("GET /users/:id returns user", async () => {
    const admin = await loginAs("admin@canyon.local", "Admin123!");
    const listRes = await api("/users?limit=1", { headers: admin.authHeader });
    const list = (await listRes.json()) as { data: { id: number }[] };
    const userId = list.data[0]!.id;

    const res = await api(`/users/${userId}`, { headers: admin.authHeader });
    expect(res.status).toBe(200);
    const user = (await res.json()) as { id: number; email: string };
    expect(user.id).toBe(userId);
    expect(user.email).toBeTruthy();
  });
});