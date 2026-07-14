import { ZodError, z } from "zod";
import { ROLE_NAMES } from "../lib/roles.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  addProjectMember,
  createProject,
  deleteProject,
  getAssignableUsers,
  getCandidateMembers,
  getProjectDetail,
  getProjectMembers,
  getProjectStats,
  listProjectsForUser,
  removeProjectMember,
  requireProjectAccess,
  requireProjectManage,
  updateProject,
  updateProjectMember,
} from "../services/projects.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasksForProject,
  listTasksForUser,
  requireTaskView,
  updateTask,
  updateTaskStatus,
} from "../services/tasks.js";
import {
  createUser,
  deactivateUser,
  getUserForAdmin,
  listUsersForAdmin,
  updateUser,
} from "../services/users.js";
import type { AgentUser, ToolResult } from "./types.js";

const paginationSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
});

const projectStatus = z.enum(["planning", "active", "on_hold", "completed"]);
const taskStatus = z.enum(["todo", "in_progress", "review", "done"]);
const taskPriority = z.enum(["low", "medium", "high", "urgent"]);
const memberRole = z.enum(["manager", "member"]);
const roleName = z.enum(ROLE_NAMES);

function ok(data: unknown): ToolResult {
  return { ok: true, data };
}

function fail(error: unknown): ToolResult {
  if (error instanceof AppError) {
    return { ok: false, error: error.message, statusCode: error.statusCode };
  }
  if (error instanceof ZodError) {
    return {
      ok: false,
      error: "Validation failed",
      statusCode: 400,
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }
  console.error("Agent tool error:", error);
  return { ok: false, error: "Internal tool error", statusCode: 500 };
}

function summarize(result: ToolResult): string {
  if (!result.ok) {
    return `Error${result.statusCode ? ` ${result.statusCode}` : ""}: ${result.error}`;
  }
  const data = result.data;
  if (data == null) return "OK";
  if (typeof data === "object" && data !== null && "message" in data) {
    return String((data as { message: string }).message);
  }
  if (typeof data === "object" && data !== null && "data" in data && "total" in data) {
    const list = data as { data: unknown[]; total: number };
    return `Returned ${Array.isArray(list.data) ? list.data.length : 0} of ${list.total} item(s)`;
  }
  if (typeof data === "object" && data !== null && "id" in data) {
    const row = data as { id: number; title?: string; name?: string; email?: string };
    const label = row.title ?? row.name ?? row.email ?? "";
    return label ? `OK id=${row.id} (${label})` : `OK id=${row.id}`;
  }
  if (Array.isArray(data)) {
    return `OK (${data.length} item(s))`;
  }
  return "OK";
}

export function summarizeToolResult(result: ToolResult): string {
  return summarize(result);
}

export async function executeTool(
  name: string,
  rawArgs: unknown,
  user: AgentUser
): Promise<ToolResult> {
  try {
    switch (name) {
      case "get_my_profile":
        return ok({
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        });

      case "list_projects": {
        const args = paginationSchema
          .extend({
            status: projectStatus.optional(),
            search: z.string().optional(),
          })
          .parse(rawArgs ?? {});
        const { rows, total } = await listProjectsForUser(
          user.id,
          user.roles,
          { limit: args.limit, offset: args.offset },
          { status: args.status, search: args.search }
        );
        const data = await Promise.all(
          rows.map(async (project) => {
            const stats = await getProjectStats(project.id);
            return { ...project, ...stats };
          })
        );
        return ok({ data, total, limit: args.limit, offset: args.offset });
      }

      case "get_project": {
        const args = z.object({ projectId: z.number().int().positive() }).parse(rawArgs);
        const project = await getProjectDetail(user.id, user.roles, args.projectId);
        return ok(project);
      }

      case "create_project": {
        const args = z
          .object({
            name: z.string().min(1).max(255),
            description: z.string().optional(),
            status: projectStatus.optional(),
          })
          .parse(rawArgs);
        const project = await createProject(user.id, user.roles, args);
        return ok(project);
      }

      case "update_project": {
        const args = z
          .object({
            projectId: z.number().int().positive(),
            name: z.string().min(1).max(255).optional(),
            description: z.string().optional(),
            status: projectStatus.optional(),
          })
          .parse(rawArgs);
        const { projectId, ...input } = args;
        const project = await updateProject(user.id, user.roles, projectId, input);
        return ok(project);
      }

      case "delete_project": {
        const args = z.object({ projectId: z.number().int().positive() }).parse(rawArgs);
        return ok(await deleteProject(user.id, user.roles, args.projectId));
      }

      case "list_project_members": {
        const args = z.object({ projectId: z.number().int().positive() }).parse(rawArgs);
        await requireProjectAccess(user.id, user.roles, args.projectId);
        return ok(await getProjectMembers(args.projectId));
      }

      case "list_candidate_members": {
        const args = z.object({ projectId: z.number().int().positive() }).parse(rawArgs);
        await requireProjectManage(user.id, user.roles, args.projectId);
        return ok(await getCandidateMembers(args.projectId));
      }

      case "list_assignable_users": {
        const args = z.object({ projectId: z.number().int().positive() }).parse(rawArgs);
        await requireProjectAccess(user.id, user.roles, args.projectId);
        return ok(await getAssignableUsers(args.projectId));
      }

      case "add_project_member": {
        const args = z
          .object({
            projectId: z.number().int().positive(),
            userId: z.number().int().positive(),
            memberRole: memberRole.optional(),
          })
          .parse(rawArgs);
        const members = await addProjectMember(user.id, user.roles, args.projectId, {
          userId: args.userId,
          memberRole: args.memberRole,
        });
        return ok(members);
      }

      case "update_project_member": {
        const args = z
          .object({
            projectId: z.number().int().positive(),
            userId: z.number().int().positive(),
            memberRole: memberRole,
          })
          .parse(rawArgs);
        const members = await updateProjectMember(
          user.id,
          user.roles,
          args.projectId,
          args.userId,
          args.memberRole
        );
        return ok(members);
      }

      case "remove_project_member": {
        const args = z
          .object({
            projectId: z.number().int().positive(),
            userId: z.number().int().positive(),
          })
          .parse(rawArgs);
        return ok(
          await removeProjectMember(user.id, user.roles, args.projectId, args.userId)
        );
      }

      case "list_tasks": {
        const args = paginationSchema
          .extend({
            status: taskStatus.optional(),
            priority: taskPriority.optional(),
            projectId: z.number().int().positive().optional(),
          })
          .parse(rawArgs ?? {});
        const { rows, total } = await listTasksForUser(
          user.id,
          user.roles,
          { limit: args.limit, offset: args.offset },
          {
            status: args.status,
            priority: args.priority,
            projectId: args.projectId,
          }
        );
        return ok({ data: rows, total, limit: args.limit, offset: args.offset });
      }

      case "list_project_tasks": {
        const args = paginationSchema
          .extend({
            projectId: z.number().int().positive(),
            status: taskStatus.optional(),
            priority: taskPriority.optional(),
          })
          .parse(rawArgs);
        const { rows, total } = await listTasksForProject(
          user.id,
          user.roles,
          args.projectId,
          { limit: args.limit, offset: args.offset },
          { status: args.status, priority: args.priority }
        );
        return ok({ data: rows, total, limit: args.limit, offset: args.offset });
      }

      case "get_task": {
        const args = z.object({ taskId: z.number().int().positive() }).parse(rawArgs);
        await requireTaskView(user.id, user.roles, args.taskId);
        const task = await getTaskById(args.taskId);
        if (!task) throw new AppError(404, "Task not found");
        return ok(task);
      }

      case "create_task": {
        const args = z
          .object({
            projectId: z.number().int().positive(),
            title: z.string().min(1).max(255),
            description: z.string().optional(),
            status: taskStatus.optional(),
            priority: taskPriority.optional(),
            assignedTo: z.number().int().positive().optional().nullable(),
            dueDate: z.string().optional().nullable(),
          })
          .parse(rawArgs);
        const { projectId, ...input } = args;
        const task = await createTask(user.id, user.roles, projectId, input);
        return ok(task);
      }

      case "update_task": {
        const args = z
          .object({
            taskId: z.number().int().positive(),
            title: z.string().min(1).max(255).optional(),
            description: z.string().optional().nullable(),
            status: taskStatus.optional(),
            priority: taskPriority.optional(),
            assignedTo: z.number().int().positive().optional().nullable(),
            dueDate: z.string().optional().nullable(),
          })
          .parse(rawArgs);
        const { taskId, ...input } = args;
        const task = await updateTask(user.id, user.roles, taskId, input);
        return ok(task);
      }

      case "update_task_status": {
        const args = z
          .object({
            taskId: z.number().int().positive(),
            status: taskStatus,
          })
          .parse(rawArgs);
        const task = await updateTaskStatus(user.id, user.roles, args.taskId, args.status);
        return ok(task);
      }

      case "delete_task": {
        const args = z.object({ taskId: z.number().int().positive() }).parse(rawArgs);
        return ok(await deleteTask(user.id, user.roles, args.taskId));
      }

      case "list_users": {
        const args = paginationSchema
          .extend({
            search: z.string().optional(),
            isActive: z.boolean().optional(),
          })
          .parse(rawArgs ?? {});
        const { rows, total } = await listUsersForAdmin(
          user.roles,
          { limit: args.limit, offset: args.offset },
          { search: args.search, isActive: args.isActive }
        );
        return ok({ data: rows, total, limit: args.limit, offset: args.offset });
      }

      case "get_user": {
        const args = z.object({ userId: z.number().int().positive() }).parse(rawArgs);
        return ok(await getUserForAdmin(user.roles, args.userId));
      }

      case "create_user": {
        const args = z
          .object({
            email: z.email(),
            password: z.string().min(8),
            name: z.string().min(1).max(255),
            roles: z.array(roleName).min(1),
          })
          .parse(rawArgs);
        return ok(await createUser(user.roles, args));
      }

      case "update_user": {
        const args = z
          .object({
            userId: z.number().int().positive(),
            email: z.email().optional(),
            password: z.string().min(8).optional(),
            name: z.string().min(1).max(255).optional(),
            isActive: z.boolean().optional(),
            roles: z.array(roleName).min(1).optional(),
          })
          .parse(rawArgs);
        const { userId, ...input } = args;
        return ok(await updateUser(user.roles, userId, input));
      }

      case "deactivate_user": {
        const args = z.object({ userId: z.number().int().positive() }).parse(rawArgs);
        return ok(await deactivateUser(user.id, user.roles, args.userId));
      }

      default:
        return { ok: false, error: `Unknown tool: ${name}`, statusCode: 400 };
    }
  } catch (error) {
    return fail(error);
  }
}
