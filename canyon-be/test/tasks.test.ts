import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, loginAs, startTestServer, stopTestServer } from "./setup.js";

beforeAll(async () => {
  await startTestServer();
});

afterAll(async () => {
  await stopTestServer();
});

describe("tasks", () => {
  test("reject assignee who is not a project member", async () => {
    const admin = await loginAs("admin@canyon.local", "Admin123!");

    const createProject = await api("/projects", {
      method: "POST",
      headers: { ...admin.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Test Project ${Date.now()}`, description: "test" }),
    });
    expect(createProject.status).toBe(201);
    const project = (await createProject.json()) as { id: number };

    const createTask = await api(`/tasks/project/${project.id}`, {
      method: "POST",
      headers: { ...admin.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Invalid assignee task",
        assignedTo: 99999,
      }),
    });
    expect(createTask.status).toBe(400);
  });

  test("GET /tasks returns paginated response", async () => {
    const admin = await loginAs("admin@canyon.local", "Admin123!");
    const res = await api("/tasks?limit=5", { headers: admin.authHeader });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: unknown[]; total: number; limit: number };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.limit).toBe(5);
  });
});