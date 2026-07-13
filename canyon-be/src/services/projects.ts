import { and, count, eq, inArray, like, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { projectMembers, projects, tasks, users } from "../db/schema.js";
import type { PaginationInput } from "../lib/pagination.js";
import { isAdmin, isProjectManager, type RoleName } from "../lib/roles.js";
import { AppError } from "../middleware/errorHandler.js";
import { getUserById } from "./users.js";

export interface ProjectListFilters {
  status?: "planning" | "active" | "on_hold" | "completed";
  search?: string;
}

export async function canAccessProject(
  userId: number,
  userRoles: RoleName[],
  projectId: number
): Promise<boolean> {
  if (isAdmin(userRoles)) return true;

  const [membership] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);

  return Boolean(membership);
}

export async function canManageProject(
  userId: number,
  userRoles: RoleName[],
  projectId: number
): Promise<boolean> {
  if (isAdmin(userRoles)) return true;
  if (!isProjectManager(userRoles)) return false;

  const [membership] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
        eq(projectMembers.memberRole, "manager")
      )
    )
    .limit(1);

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return Boolean(membership) || project?.createdBy === userId;
}

function buildProjectFilters(filters: ProjectListFilters) {
  const conditions = [];
  if (filters.status) {
    conditions.push(eq(projects.status, filters.status));
  }
  if (filters.search) {
    conditions.push(like(projects.name, `%${filters.search}%`));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listProjectsForUser(
  userId: number,
  userRoles: RoleName[],
  pagination: PaginationInput,
  filters: ProjectListFilters = {}
) {
  const filterWhere = buildProjectFilters(filters);

  if (isAdmin(userRoles)) {
    const [totalRow] = await db.select({ total: count() }).from(projects).where(filterWhere);
    const total = Number(totalRow?.total ?? 0);

    const rows = await db
      .select()
      .from(projects)
      .where(filterWhere)
      .orderBy(projects.createdAt)
      .limit(pagination.limit)
      .offset(pagination.offset);

    return { rows, total };
  }

  const memberships = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  const projectIds = memberships.map((m) => m.projectId);
  if (projectIds.length === 0) {
    return { rows: [], total: 0 };
  }

  const where = filterWhere
    ? and(inArray(projects.id, projectIds), filterWhere)
    : inArray(projects.id, projectIds);

  const [totalRow] = await db.select({ total: count() }).from(projects).where(where);
  const total = Number(totalRow?.total ?? 0);

  const rows = await db
    .select()
    .from(projects)
    .where(where)
    .orderBy(projects.createdAt)
    .limit(pagination.limit)
    .offset(pagination.offset);

  return { rows, total };
}

export async function getProjectById(projectId: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return project ?? null;
}

export async function getProjectMembers(projectId: number) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      memberRole: projectMembers.memberRole,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));
}

export async function getAssignableUsers(projectId: number) {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(and(eq(projectMembers.projectId, projectId), eq(users.isActive, true)));
}

export async function getCandidateMembers(projectId: number) {
  const members = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, projectId));

  const memberIds = members.map((m) => m.userId);
  const allUsers = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.isActive, true));

  return allUsers.filter((u) => !memberIds.includes(u.id));
}

export async function getProjectStats(projectId: number) {
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
      done: sql<number>`sum(case when ${tasks.status} = 'done' then 1 else 0 end)`,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  return {
    totalTasks: Number(stats?.total ?? 0),
    completedTasks: Number(stats?.done ?? 0),
  };
}

export async function requireProjectAccess(
  userId: number,
  userRoles: RoleName[],
  projectId: number
) {
  const allowed = await canAccessProject(userId, userRoles, projectId);
  if (!allowed) {
    throw new AppError(403, "You do not have access to this project");
  }
}

export async function requireProjectManage(
  userId: number,
  userRoles: RoleName[],
  projectId: number
) {
  const allowed = await canManageProject(userId, userRoles, projectId);
  if (!allowed) {
    throw new AppError(403, "You cannot manage this project");
  }
}

export async function requireProjectMember(projectId: number, assigneeId: number) {
  const user = await getUserById(assigneeId);
  if (!user || !user.isActive) {
    throw new AppError(400, "Assignee must be an active user");
  }

  const [membership] = await db
    .select()
    .from(projectMembers)
    .where(
      and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, assigneeId))
    )
    .limit(1);

  if (!membership) {
    throw new AppError(400, "Assignee must be a project member");
  }
}