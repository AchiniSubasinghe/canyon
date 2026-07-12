import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { projectMembers, tasks, users } from "../db/schema.js";
import { isAdmin, isProjectManager, type RoleName } from "../lib/roles.js";
import { AppError } from "../middleware/errorHandler.js";
import { canAccessProject, canManageProject } from "./projects.js";

export async function listTasksForProject(
  userId: number,
  userRoles: RoleName[],
  projectId: number
) {
  const allowed = await canAccessProject(userId, userRoles, projectId);
  if (!allowed) {
    throw new AppError(403, "You do not have access to this project");
  }

  const rows = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assignedTo: tasks.assignedTo,
      assigneeName: users.name,
      createdBy: tasks.createdBy,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.updatedAt);

  return rows;
}

export async function listTasksForUser(userId: number, userRoles: RoleName[]) {
  if (isAdmin(userRoles)) {
    return db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        assignedTo: tasks.assignedTo,
        assigneeName: users.name,
        createdBy: tasks.createdBy,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .orderBy(tasks.updatedAt);
  }

  if (isProjectManager(userRoles)) {
    const memberships = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));

    const projectIds = [...new Set(memberships.map((m) => m.projectId))];
    if (projectIds.length === 0) {
      return [];
    }

    return db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        assignedTo: tasks.assignedTo,
        assigneeName: users.name,
        createdBy: tasks.createdBy,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(or(inArray(tasks.projectId, projectIds), eq(tasks.assignedTo, userId)))
      .orderBy(tasks.updatedAt);
  }

  return db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assignedTo: tasks.assignedTo,
      assigneeName: users.name,
      createdBy: tasks.createdBy,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(eq(tasks.assignedTo, userId))
    .orderBy(tasks.updatedAt);
}

export async function getTaskById(taskId: number) {
  const [task] = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assignedTo: tasks.assignedTo,
      assigneeName: users.name,
      createdBy: tasks.createdBy,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(eq(tasks.id, taskId))
    .limit(1);

  return task ?? null;
}

export async function canViewTask(
  userId: number,
  userRoles: RoleName[],
  taskId: number
): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) return false;
  if (isAdmin(userRoles)) return true;
  if (task.assignedTo === userId) return true;
  return canAccessProject(userId, userRoles, task.projectId);
}

export async function canEditTask(
  userId: number,
  userRoles: RoleName[],
  taskId: number
): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) return false;
  if (isAdmin(userRoles)) return true;
  if (await canManageProject(userId, userRoles, task.projectId)) return true;
  return task.assignedTo === userId;
}

export async function canUpdateTaskStatus(
  userId: number,
  userRoles: RoleName[],
  taskId: number
): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) return false;
  if (isAdmin(userRoles)) return true;
  if (await canManageProject(userId, userRoles, task.projectId)) return true;
  return task.assignedTo === userId;
}

export async function requireTaskView(userId: number, userRoles: RoleName[], taskId: number) {
  const allowed = await canViewTask(userId, userRoles, taskId);
  if (!allowed) throw new AppError(403, "You do not have access to this task");
}

export async function requireTaskEdit(userId: number, userRoles: RoleName[], taskId: number) {
  const allowed = await canEditTask(userId, userRoles, taskId);
  if (!allowed) throw new AppError(403, "You cannot edit this task");
}