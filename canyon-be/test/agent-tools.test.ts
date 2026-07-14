import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { executeTool } from "../src/agent/handlers.js";
import { toAgentTable } from "../src/agent/table-payload.js";
import type { AgentUser } from "../src/agent/types.js";
import { getUserByEmail, getUserRoles } from "../src/services/users.js";
import { api, loginAs, startTestServer, stopTestServer } from "./setup.js";

async function agentUser(email: string): Promise<AgentUser> {
  const row = await getUserByEmail(email);
  if (!row) throw new Error(`Missing seed user ${email}`);
  const roles = await getUserRoles(row.id);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    roles,
  };
}

beforeAll(async () => {
  await startTestServer();
});

afterAll(async () => {
  await stopTestServer();
});

describe("agent tools RBAC", () => {
  test("team member list_tasks only returns assigned tasks", async () => {
    const member = await agentUser("member@canyon.local");
    const result = await executeTool("list_tasks", { limit: 50 }, member);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as { data: Array<{ assignedTo: number | null }> };
    for (const task of data.data) {
      expect(task.assignedTo).toBe(member.id);
    }
  });

  test("toAgentTable maps list_projects into UI columns", async () => {
    const admin = await agentUser("admin@canyon.local");
    const result = await executeTool("list_projects", { limit: 10 }, admin);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const table = toAgentTable("list_projects", result);
    expect(table).toBeDefined();
    expect(table!.columns.map((c) => c.key)).toEqual(["id", "name", "status", "tasks"]);
    expect(table!.rows.length).toBeGreaterThan(0);
    expect(table!.rows[0]).toHaveProperty("name");
  });

  test("toAgentTable maps list_tasks into UI columns", async () => {
    const admin = await agentUser("admin@canyon.local");
    const result = await executeTool("list_tasks", { limit: 10 }, admin);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const table = toAgentTable("list_tasks", result);
    if ((result.data as { data: unknown[] }).data.length === 0) {
      expect(table).toBeUndefined();
      return;
    }
    expect(table).toBeDefined();
    expect(table!.columns.some((c) => c.key === "title")).toBe(true);
    expect(table!.rows[0]).toHaveProperty("status");
  });


  test("team member cannot create_project or create_task", async () => {
    const member = await agentUser("member@canyon.local");

    const createProject = await executeTool(
      "create_project",
      { name: `Member Blocked ${Date.now()}` },
      member
    );
    expect(createProject.ok).toBe(false);
    if (!createProject.ok) expect(createProject.statusCode).toBe(403);

    const projects = await executeTool("list_projects", { limit: 5 }, member);
    expect(projects.ok).toBe(true);
    if (!projects.ok) return;
    const first = (projects.data as { data: Array<{ id: number }> }).data[0];
    if (!first) return;

    const createTask = await executeTool(
      "create_task",
      { projectId: first.id, title: "Should fail" },
      member
    );
    expect(createTask.ok).toBe(false);
    if (!createTask.ok) expect(createTask.statusCode).toBe(403);
  });

  test("team member cannot list_users or delete_project", async () => {
    const member = await agentUser("member@canyon.local");

    const users = await executeTool("list_users", {}, member);
    expect(users.ok).toBe(false);
    if (!users.ok) expect(users.statusCode).toBe(403);

    const del = await executeTool("delete_project", { projectId: 1 }, member);
    expect(del.ok).toBe(false);
    if (!del.ok) expect(del.statusCode).toBe(403);
  });

  test("project manager can create_project but not list_users or delete_project", async () => {
    const pm = await agentUser("pm@canyon.local");

    const created = await executeTool(
      "create_project",
      { name: `PM Agent Project ${Date.now()}`, description: "from agent tools test" },
      pm
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const project = created.data as { id: number };
    expect(project.id).toBeGreaterThan(0);

    const users = await executeTool("list_users", {}, pm);
    expect(users.ok).toBe(false);
    if (!users.ok) expect(users.statusCode).toBe(403);

    const del = await executeTool("delete_project", { projectId: project.id }, pm);
    expect(del.ok).toBe(false);
    if (!del.ok) expect(del.statusCode).toBe(403);

    // cleanup via admin tool
    const admin = await agentUser("admin@canyon.local");
    await executeTool("delete_project", { projectId: project.id }, admin);
  });

  test("project manager can create_task on managed project", async () => {
    const pm = await agentUser("pm@canyon.local");
    const created = await executeTool(
      "create_project",
      { name: `PM Task Project ${Date.now()}` },
      pm
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const projectId = (created.data as { id: number }).id;

    const task = await executeTool(
      "create_task",
      {
        projectId,
        title: "Agent created task",
        priority: "high",
        assignedTo: pm.id,
      },
      pm
    );
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    expect((task.data as { title: string }).title).toBe("Agent created task");

    const admin = await agentUser("admin@canyon.local");
    await executeTool("delete_project", { projectId }, admin);
  });

  test("admin can list_users and create_user", async () => {
    const admin = await agentUser("admin@canyon.local");
    const list = await executeTool("list_users", { limit: 10 }, admin);
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect((list.data as { total: number }).total).toBeGreaterThan(0);

    const email = `agent-user-${Date.now()}@canyon.local`;
    const created = await executeTool(
      "create_user",
      {
        email,
        password: "AgentTest1!",
        name: "Agent Test User",
        roles: ["team_member"],
      },
      admin
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const userId = (created.data as { id: number }).id;

    const deactivated = await executeTool("deactivate_user", { userId }, admin);
    expect(deactivated.ok).toBe(true);
  });

  test("admin cannot deactivate self via tool", async () => {
    const admin = await agentUser("admin@canyon.local");
    const result = await executeTool("deactivate_user", { userId: admin.id }, admin);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(400);
  });

  test("validation errors return ok:false", async () => {
    const admin = await agentUser("admin@canyon.local");
    const result = await executeTool("create_task", { projectId: 1 }, admin);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(400);
      expect(result.error).toBe("Validation failed");
    }
  });

  test("unknown tool name fails", async () => {
    const admin = await agentUser("admin@canyon.local");
    const result = await executeTool("launch_missiles", {}, admin);
    expect(result.ok).toBe(false);
  });

  test("assignee can update_task_status", async () => {
    const admin = await agentUser("admin@canyon.local");
    const member = await agentUser("member@canyon.local");

    const project = await executeTool(
      "create_project",
      { name: `Assignee Status ${Date.now()}` },
      admin
    );
    expect(project.ok).toBe(true);
    if (!project.ok) return;
    const projectId = (project.data as { id: number }).id;

    await executeTool(
      "add_project_member",
      { projectId, userId: member.id, memberRole: "member" },
      admin
    );

    const task = await executeTool(
      "create_task",
      { projectId, title: "Member task", assignedTo: member.id },
      admin
    );
    expect(task.ok).toBe(true);
    if (!task.ok) return;
    const taskId = (task.data as { id: number }).id;

    const status = await executeTool(
      "update_task_status",
      { taskId, status: "in_progress" },
      member
    );
    expect(status.ok).toBe(true);
    if (status.ok) {
      expect((status.data as { status: string }).status).toBe("in_progress");
    }

    const delTask = await executeTool("delete_task", { taskId }, member);
    expect(delTask.ok).toBe(false);
    if (!delTask.ok) expect(delTask.statusCode).toBe(403);

    await executeTool("delete_project", { projectId }, admin);
  });

  test("chat endpoint still requires auth", async () => {
    const res = await api("/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
    });
    expect(res.status).toBe(401);
  });

  test("chat endpoint accepts authenticated request shape (may fail without deepseek key mid-stream)", async () => {
    const admin = await loginAs("admin@canyon.local", "Admin123!");
    const res = await api("/agent/chat", {
      method: "POST",
      headers: { ...admin.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Reply with exactly: pong" }],
      }),
    });

    // 200 SSE if key present, or 500 if missing; never 401 for valid token
    expect([200, 500, 502]).toContain(res.status);
    if (res.status === 200) {
      const text = await res.text();
      expect(text.includes("event:") || text.includes("data:")).toBe(true);
    }
  });
});
