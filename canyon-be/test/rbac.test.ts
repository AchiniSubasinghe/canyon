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
    const admin = await loginAs("achini@canyon.local", "achini123");
    const member = await loginAs("emalin@canyon.local", "emalin123");

    // Fixture: project + member membership + one assigned task (no seed domain data).
    const createProject = await api("/projects", {
      method: "POST",
      headers: { ...admin.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ name: `RBAC Project ${Date.now()}` }),
    });
    expect(createProject.status).toBe(201);
    const project = (await createProject.json()) as { id: number };

    const memberUser = await api("/users?limit=50", { headers: admin.authHeader });
    expect(memberUser.status).toBe(200);
    const usersBody = (await memberUser.json()) as {
      data: Array<{ id: number; email: string }>;
    };
    const memberId = usersBody.data.find((u) => u.email === "emalin@canyon.local")?.id;
    expect(memberId).toBeTruthy();

    const addMember = await api(`/projects/${project.id}/members`, {
      method: "POST",
      headers: { ...admin.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ userId: memberId, memberRole: "member" }),
    });
    expect(addMember.status).toBe(201);

    const createAssigned = await api(`/tasks/project/${project.id}`, {
      method: "POST",
      headers: { ...admin.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Assigned to member", assignedTo: memberId }),
    });
    expect(createAssigned.status).toBe(201);

    const createUnassigned = await api(`/tasks/project/${project.id}`, {
      method: "POST",
      headers: { ...admin.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Unassigned task" }),
    });
    expect(createUnassigned.status).toBe(201);

    const tasksRes = await api(`/tasks/project/${project.id}?limit=50`, {
      headers: member.authHeader,
    });
    expect(tasksRes.status).toBe(200);
    const tasksBody = (await tasksRes.json()) as {
      data: Array<{ assignedTo: number | null; title: string }>;
    };

    expect(tasksBody.data.length).toBeGreaterThan(0);
    for (const task of tasksBody.data) {
      expect(task.assignedTo).toBe(memberId);
    }

    // Cleanup
    await api(`/projects/${project.id}`, {
      method: "DELETE",
      headers: admin.authHeader,
    });
  });
});
