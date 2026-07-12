import { and, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { projectMembers, projects, tasks, users } from "../db/schema.js";
import { isAdmin, isProjectManager, type RoleName } from "../lib/roles.js";
import { AppError } from "../middleware/errorHandler.js";

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

export async function listProjectsForUser(userId: number, userRoles: RoleName[]) {
  if (isAdmin(userRoles)) {
    return db.select().from(projects).orderBy(projects.createdAt);
  }

  const memberships = await db
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId));

  const projectIds = memberships.map((m) => m.projectId);
  if (projectIds.length === 0) return [];

  return db
    .select()
    .from(projects)
    .where(inArray(projects.id, projectIds))
    .orderBy(projects.createdAt);
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