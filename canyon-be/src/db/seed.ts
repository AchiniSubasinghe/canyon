import { hashPassword } from "../lib/password.js";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import {
  projectMembers,
  projects,
  refreshTokens,
  roles,
  tasks,
  userRoles,
  users,
} from "./schema.js";

/** The only accounts kept by seed — one per role. */
const SEED_USERS = [
  {
    email: "admin@canyon.local",
    password: "Admin123!",
    name: "System Admin",
    role: "administrator" as const,
  },
  {
    email: "pm@canyon.local",
    password: "Pm123456!",
    name: "Project Manager",
    role: "project_manager" as const,
  },
  {
    email: "member@canyon.local",
    password: "Member123!",
    name: "Team Member",
    role: "team_member" as const,
  },
] as const;

const SEED_EMAILS = SEED_USERS.map((u) => u.email);

async function main() {
  // Wipe domain data so seed always ends with only the 3 role users.
  await db.delete(tasks);
  await db.delete(projectMembers);
  await db.delete(projects);
  await db.delete(refreshTokens);

  const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
  const extraIds = allUsers.filter((u) => !SEED_EMAILS.includes(u.email as (typeof SEED_EMAILS)[number])).map((u) => u.id);

  if (extraIds.length > 0) {
    for (const id of extraIds) {
      await db.delete(userRoles).where(eq(userRoles.userId, id));
      await db.delete(users).where(eq(users.id, id));
    }
    console.log(`Removed ${extraIds.length} non-seed user(s)`);
  }

  const roleNames = ["administrator", "project_manager", "team_member"] as const;

  for (const name of roleNames) {
    const [existing] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
    if (!existing) {
      await db.insert(roles).values({ name });
    }
  }

  const allRoles = await db.select().from(roles);
  const roleByName = Object.fromEntries(allRoles.map((r) => [r.name, r.id])) as Record<
    string,
    number
  >;

  for (const name of roleNames) {
    if (!roleByName[name]) {
      throw new Error(`Required role missing: ${name}`);
    }
  }

  for (const seed of SEED_USERS) {
    const roleId = roleByName[seed.role]!;
    const [existing] = await db.select().from(users).where(eq(users.email, seed.email)).limit(1);

    if (existing) {
      // Restore role, profile, and documented password so seed stays idempotent.
      const passwordHash = await hashPassword(seed.password);
      await db.delete(userRoles).where(eq(userRoles.userId, existing.id));
      await db.insert(userRoles).values({ userId: existing.id, roleId });
      await db
        .update(users)
        .set({ name: seed.name, isActive: true, passwordHash })
        .where(eq(users.id, existing.id));
      console.log(`Reset user: ${seed.email}`);
      continue;
    }

    const passwordHash = await hashPassword(seed.password);
    const [result] = await db.insert(users).values({
      email: seed.email,
      passwordHash,
      name: seed.name,
    });

    await db.insert(userRoles).values({
      userId: result.insertId,
      roleId,
    });

    console.log(`Created user: ${seed.email}`);
  }

  console.log("Seed complete — 3 users only (no projects or tasks)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
