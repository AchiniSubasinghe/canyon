import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { listProjectsForUser } from "../services/projects.js";
import { listTasksForUser } from "../services/tasks.js";
import type { RoleName } from "../lib/roles.js";

const router = Router();

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1)
    .max(50),
});

router.use(requireAuth);

function roleLabel(roles: RoleName[]): string {
  if (roles.includes("administrator")) return "administrator";
  if (roles.includes("project_manager")) return "project_manager";
  return "team_member";
}

function buildCapabilities(roles: RoleName[]): string {
  const role = roleLabel(roles);
  if (role === "administrator") {
    return `You are assisting an administrator.
Capabilities:
- Full visibility over every project and every task in the system.
- Can create, edit, deactivate users and assign any roles.
- Can create, edit, and delete any project.
- Can manage members on any project and change statuses.
- Can create, edit, update status, and delete any task.`;
  }
  if (role === "project_manager") {
    return `You are assisting a project_manager.
Capabilities:
- Can create new projects (you become manager automatically).
- On projects where you are a manager (or creator): add/remove members, change member roles, edit project settings, create tasks, edit any task in the project, delete tasks.
- You can see every task in projects you manage plus any tasks assigned directly to you.
- You cannot manage users or delete projects.`;
  }
  return `You are assisting a team_member.
Capabilities:
- You can only see projects you have been added to as a member.
- Task lists only ever return tasks assigned to you.
- You can edit title, description, priority, due date and change status on tasks that are assigned to you.
- You cannot create projects, create tasks, manage other members, or see tasks that are not assigned to you.`;
}

async function getUserContext(userId: number, roles: RoleName[]) {
  const [projectsRes, tasksRes] = await Promise.all([
    listProjectsForUser(userId, roles, { limit: 20, offset: 0 }),
    listTasksForUser(userId, roles, { limit: 20, offset: 0 }),
  ]);

  const projects = projectsRes.rows.map((p) => `${p.name} (${p.status})`).join(", ") || "none";
  const tasks = tasksRes.rows
    .map((t) => `#${t.id} "${t.title}" [${t.status}] in project ${t.projectId}${t.dueDate ? ` due ${t.dueDate}` : ""}`)
    .join("; ") || "none";

  return { projects, tasks };
}

function buildSystemPrompt(roles: RoleName[], context: { projects: string; tasks: string }) {
  const role = roleLabel(roles);
  const caps = buildCapabilities(roles);

  return {
    role: "system" as const,
    content: `You are Canyon Agent — a precise, no-nonsense assistant embedded inside the Canyon project management system.

Current user role: ${role}

${caps}

Current user context (live data):
Visible projects: ${context.projects}
Your visible tasks: ${context.tasks}

Rules you MUST follow on every reply:
1. Only discuss, explain, or suggest actions the current role is allowed to perform according to the capabilities listed above.
2. When the user asks for something impossible for their role, reply with a short refusal that quotes the exact limitation (use the wording from the capabilities list).
3. Use the live context data when the user asks about their work. Do not invent projects or tasks.
4. Be concise. Use short paragraphs. Never moralize.
5. If the user asks a general question about how Canyon works, answer only from the perspective of their role.

You are not a generic assistant. You are the Canyon Agent that respects role boundaries.`,
  };
}

router.post("/chat", async (req, res, next) => {
  try {
    const { messages } = chatSchema.parse(req.body);
    const user = req.user!;

    const context = await getUserContext(user.id, user.roles);
    const system = buildSystemPrompt(user.roles, context);

    const deepseekMessages = [system, ...messages];

    if (!config.DEEPSEEK_API_KEY) {
      throw new AppError(500, "Canyon Agent is not configured (missing DEEPSEEK_API_KEY)");
    }

    const upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: deepseekMessages,
        stream: true,
        temperature: 0.2,
        max_tokens: 1200,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      throw new AppError(502, `Deepseek error: ${upstream.status} ${text}`);
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } finally {
      res.end();
    }
  } catch (err) {
    next(err);
  }
});

export default router;
