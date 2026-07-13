import { and, count, eq, inArray, like, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { roles, userRoles, users } from "../db/schema.js";
import type { PaginationInput } from "../lib/pagination.js";
import type { RoleName } from "../lib/roles.js";
import { ROLE_NAMES } from "../lib/roles.js";

export interface UserListFilters {
  search?: string;
  isActive?: boolean;
}

export async function getUserRoles(userId: number): Promise<RoleName[]> {
  const rows = await db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  return rows
    .map((row) => row.name)
    .filter((name): name is RoleName => ROLE_NAMES.includes(name as RoleName));
}

export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user ?? null;
}

export async function getUserById(id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function formatUser(user: typeof users.$inferSelect) {
  const roleNames = await getUserRoles(user.id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    createdAt: user.createdAt,
    roles: roleNames,
  };
}

function buildUserFilters(filters: UserListFilters) {
  const conditions = [];
  if (filters.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive));
  }
  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push(or(like(users.name, term), like(users.email, term)));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listUsers(
  pagination: PaginationInput,
  filters: UserListFilters = {}
) {
  const where = buildUserFilters(filters);

  const [totalRow] = await db.select({ total: count() }).from(users).where(where);
  const total = Number(totalRow?.total ?? 0);

  const allUsers = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(users.createdAt)
    .limit(pagination.limit)
    .offset(pagination.offset);

  const userIds = allUsers.map((u) => u.id);
  if (userIds.length === 0) {
    return { rows: [], total };
  }

  const roleRows = await db
    .select({ userId: userRoles.userId, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.userId, userIds));

  const rows = allUsers.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    isActive: user.isActive,
    createdAt: user.createdAt,
    roles: roleRows
      .filter((r) => r.userId === user.id)
      .map((r) => r.roleName)
      .filter((name): name is RoleName => ROLE_NAMES.includes(name as RoleName)),
  }));

  return { rows, total };
}