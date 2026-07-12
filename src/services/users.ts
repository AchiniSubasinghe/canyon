import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { roles, userRoles, users } from "../db/schema.js";
import type { RoleName } from "../lib/roles.js";
import { ROLE_NAMES } from "../lib/roles.js";

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

export async function listUsers() {
  const allUsers = await db.select().from(users).orderBy(users.createdAt);
  const userIds = allUsers.map((u) => u.id);

  if (userIds.length === 0) return [];

  const roleRows = await db
    .select({ userId: userRoles.userId, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.userId, userIds));

  return allUsers.map((user) => ({
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
}