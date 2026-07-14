import { and, count, eq, inArray, like, or } from "drizzle-orm";
import { db } from "../db/index.js";
import { roles, userRoles, users } from "../db/schema.js";
import type { PaginationInput } from "../lib/pagination.js";
import { hashPassword } from "../lib/password.js";
import type { RoleName } from "../lib/roles.js";
import { isAdmin, ROLE_NAMES } from "../lib/roles.js";
import { AppError } from "../middleware/errorHandler.js";
import { revokeAllUserTokens } from "./tokens.js";

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

function requireAdmin(userRoles: RoleName[]) {
  if (!isAdmin(userRoles)) {
    throw new AppError(403, "Insufficient permissions");
  }
}

export async function listUsersForAdmin(
  actorRoles: RoleName[],
  pagination: PaginationInput,
  filters: UserListFilters = {}
) {
  requireAdmin(actorRoles);
  return listUsers(pagination, filters);
}

export async function getUserForAdmin(actorRoles: RoleName[], userId: number) {
  requireAdmin(actorRoles);
  const user = await getUserById(userId);
  if (!user) throw new AppError(404, "User not found");
  return formatUser(user);
}

export async function createUser(
  actorRoles: RoleName[],
  input: {
    email: string;
    password: string;
    name: string;
    roles: RoleName[];
  }
) {
  requireAdmin(actorRoles);

  const existing = await getUserByEmail(input.email);
  if (existing) {
    throw new AppError(409, "Email already in use");
  }

  const passwordHash = await hashPassword(input.password);
  const [result] = await db.insert(users).values({
    email: input.email,
    passwordHash,
    name: input.name,
  });

  const roleRows = await db.select().from(roles).where(inArray(roles.name, input.roles));

  if (roleRows.length !== input.roles.length) {
    throw new AppError(400, "One or more roles are invalid");
  }

  await db.insert(userRoles).values(
    roleRows.map((role) => ({
      userId: result.insertId,
      roleId: role.id,
    }))
  );

  return {
    id: result.insertId,
    email: input.email,
    name: input.name,
    roles: input.roles,
  };
}

export async function updateUser(
  actorRoles: RoleName[],
  userId: number,
  input: {
    email?: string;
    password?: string;
    name?: string;
    isActive?: boolean;
    roles?: RoleName[];
  }
) {
  requireAdmin(actorRoles);

  const user = await getUserById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (input.email && input.email !== user.email) {
    const existing = await getUserByEmail(input.email);
    if (existing && existing.id !== userId) {
      throw new AppError(409, "Email already in use");
    }
  }

  const updates: Partial<typeof users.$inferInsert> = {};
  if (input.email) updates.email = input.email;
  if (input.name) updates.name = input.name;
  if (input.isActive !== undefined) updates.isActive = input.isActive;
  if (input.password) updates.passwordHash = await hashPassword(input.password);

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  if (input.password) {
    await revokeAllUserTokens(userId);
  }

  if (input.roles) {
    const roleRows = await db.select().from(roles).where(inArray(roles.name, input.roles));

    if (roleRows.length !== input.roles.length) {
      throw new AppError(400, "One or more roles are invalid");
    }

    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    await db.insert(userRoles).values(
      roleRows.map((role) => ({
        userId,
        roleId: role.id,
      }))
    );
  }

  const updated = await getUserById(userId);
  const roleNames = input.roles ?? (await getUserRoles(userId));

  return {
    id: updated!.id,
    email: updated!.email,
    name: updated!.name,
    isActive: updated!.isActive,
    roles: roleNames,
  };
}

export async function deactivateUser(
  actorId: number,
  actorRoles: RoleName[],
  userId: number
) {
  requireAdmin(actorRoles);

  if (userId === actorId) {
    throw new AppError(400, "You cannot deactivate your own account");
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  await db.update(users).set({ isActive: false }).where(eq(users.id, userId));
  await revokeAllUserTokens(userId);
  return { message: "User deactivated" };
}
