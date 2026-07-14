import { and, count, eq, inArray, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { projectMembers, tasks, users } from "../db/schema.js";
import type { PaginationInput } from "../lib/pagination.js";
import { isAdmin, isProjectManager, type RoleName } from "../lib/roles.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  canAccessProject,
  canManageProject,
  requireProjectManage,
  requireProjectMember,
} from "./projects.js";

export interface TaskListFilters {
  status?: "todo" | "in_progress" | "review" | "done";
  priority?: "low" | "medium" | "high" | "urgent";
  projectId?: number;
}

const taskSelect = {
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
};

function buildTaskFilters(filters: TaskListFilters) {
  const conditions = [];
  if (filters.status) {
    conditions.push(eq(tasks.status, filters.status));
  }
  if (filters.priority) {
    conditions.push(eq(tasks.priority, filters.priority));
  }
  if (filters.projectId) {
    conditions.push(eq(tasks.projectId, filters.projectId));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function queryTasks(
  baseWhere: ReturnType<typeof and> | ReturnType<typeof eq> | ReturnType<typeof or> | undefined,
  pagination: PaginationInput,
  filters: TaskListFilters
) {
  const filterWhere = buildTaskFilters(filters);
  const where = baseWhere && filterWhere ? and(baseWhere, filterWhere) : baseWhere ?? filterWhere;

  const [totalRow] = await db.select({ total: count() }).from(tasks).where(where);
  const total = Number(totalRow?.total ?? 0);

  const rows = await db
    .select(taskSelect)
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(where)
    .orderBy(tasks.updatedAt)
    .limit(pagination.limit)
    .offset(pagination.offset);

  return { rows, total };
}

export async function listTasksForProject(
  userId: number,
  userRoles: RoleName[],
  projectId: number,
  pagination: PaginationInput,
  filters: TaskListFilters = {}
) {
  const allowed = await canAccessProject(userId, userRoles, projectId);
  if (!allowed) {
    throw new AppError(403, "You do not have access to this project");
  }

  const isTeamMemberOnly =
    !isAdmin(userRoles) && !isProjectManager(userRoles);

  const baseWhere = isTeamMemberOnly
    ? and(eq(tasks.projectId, projectId), eq(tasks.assignedTo, userId))
    : eq(tasks.projectId, projectId);

  return queryTasks(baseWhere, pagination, filters);
}

export async function listTasksForUser(
  userId: number,
  userRoles: RoleName[],
  pagination: PaginationInput,
  filters: TaskListFilters = {}
) {
  if (isAdmin(userRoles)) {
    return queryTasks(undefined, pagination, filters);
  }

  if (isProjectManager(userRoles)) {
    const memberships = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));

    const projectIds = [...new Set(memberships.map((m) => m.projectId))];
    if (projectIds.length === 0) {
      return queryTasks(eq(tasks.assignedTo, userId), pagination, filters);
    }

    return queryTasks(
      or(inArray(tasks.projectId, projectIds), eq(tasks.assignedTo, userId)),
      pagination,
      filters
    );
  }

  return queryTasks(eq(tasks.assignedTo, userId), pagination, filters);
}

export async function getTaskById(taskId: number) {
  const [task] = await db
    .select(taskSelect)
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
  return canEditTask(userId, userRoles, taskId);
}

export async function requireTaskView(userId: number, userRoles: RoleName[], taskId: number) {
  const allowed = await canViewTask(userId, userRoles, taskId);
  if (!allowed) throw new AppError(403, "You do not have access to this task");
}

export async function requireTaskEdit(userId: number, userRoles: RoleName[], taskId: number) {
  const allowed = await canEditTask(userId, userRoles, taskId);
  if (!allowed) throw new AppError(403, "You cannot edit this task");
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

function parseDueDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, "Invalid due date");
  }
  return date;
}

export async function createTask(
  userId: number,
  userRoles: RoleName[],
  projectId: number,
  input: {
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedTo?: number | null;
    dueDate?: string | null;
  }
) {
  const canCreate = isAdmin(userRoles) || isProjectManager(userRoles);
  if (!canCreate) {
    throw new AppError(403, "You cannot create tasks");
  }

  await requireProjectManage(userId, userRoles, projectId);

  if (input.assignedTo) {
    await requireProjectMember(projectId, input.assignedTo);
  }

  const [result] = await db.insert(tasks).values({
    projectId,
    title: input.title,
    description: input.description,
    status: input.status ?? "todo",
    priority: input.priority ?? "medium",
    assignedTo: input.assignedTo ?? null,
    createdBy: userId,
    dueDate: parseDueDate(input.dueDate) ?? null,
  });

  return getTaskById(result.insertId);
}

export async function updateTask(
  userId: number,
  userRoles: RoleName[],
  taskId: number,
  input: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedTo?: number | null;
    dueDate?: string | null;
  }
) {
  await requireTaskEdit(userId, userRoles, taskId);

  const existing = await getTaskById(taskId);
  if (!existing) throw new AppError(404, "Task not found");

  if (input.assignedTo) {
    await requireProjectMember(existing.projectId, input.assignedTo);
  }

  const updates: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedTo?: number | null;
    dueDate?: Date | null;
  } = {};

  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.status !== undefined) updates.status = input.status;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.assignedTo !== undefined) updates.assignedTo = input.assignedTo;
  if (input.dueDate !== undefined) updates.dueDate = parseDueDate(input.dueDate) ?? null;

  await db.update(tasks).set(updates).where(eq(tasks.id, taskId));
  return getTaskById(taskId);
}

export async function updateTaskStatus(
  userId: number,
  userRoles: RoleName[],
  taskId: number,
  status: TaskStatus
) {
  const allowed = await canUpdateTaskStatus(userId, userRoles, taskId);
  if (!allowed) throw new AppError(403, "You cannot update this task status");

  await db.update(tasks).set({ status }).where(eq(tasks.id, taskId));
  return getTaskById(taskId);
}

export async function deleteTask(userId: number, userRoles: RoleName[], taskId: number) {
  const task = await getTaskById(taskId);
  if (!task) throw new AppError(404, "Task not found");

  await requireProjectManage(userId, userRoles, task.projectId);
  await db.delete(tasks).where(eq(tasks.id, taskId));
  return { message: "Task deleted" };
}

