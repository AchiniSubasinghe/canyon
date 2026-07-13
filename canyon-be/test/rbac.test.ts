import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { api, loginAs, startTestServer, stopTestServer } from "./setup.js";

beforeAll(async () => {
  await startTestServer();
});

afterAll(async () => {
  await stopTestServer();
});

describe("rbac", () => {
  test("team member only sees assigned tasks in project list", async () => {
    const member = await loginAs("member@canyon.local", "Member123!");

    const projectsRes = await api("/projects?limit=10", {
      headers: member.authHeader,
    });
    expect(projectsRes.status).toBe(200);
    const projectsBody = (await projectsRes.json()) as { data: { id: number }[] };
    const projectId = projectsBody.data[0]?.id;
    expect(projectId).toBeTruthy();

    const tasksRes = await api(`/tasks/project/${projectId}?limit=50`, {
      headers: member.authHeader,
    });
    expect(tasksRes.status).toBe(200);
    const tasksBody = (await tasksRes.json()) as {
      data: { assignedTo: number | null }[];
    };

    for (const task of tasksBody.data) {
      expect(task.assignedTo).toBeTruthy();
    }
  });
});