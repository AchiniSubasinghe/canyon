import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { roles, userRoles, users } from "./schema.js";

async function main() {
  const roleNames = ["administrator", "project_manager", "team_member"] as const;

  for (const name of roleNames) {
    const [existing] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
    if (!existing) {
      await db.insert(roles).values({ name });
    }
  }

  const allRoles = await db.select().from(roles);
  const adminRole = allRoles.find((r) => r.name === "administrator");
  const pmRole = allRoles.find((r) => r.name === "project_manager");
  const memberRole = allRoles.find((r) => r.name === "team_member");

  if (!adminRole || !pmRole || !memberRole) {
    throw new Error("Required roles missing");
  }

  const seedUsers = [
    {
      email: "admin@canyon.local",
      password: "Admin123!",
      name: "System Admin",
      roleId: adminRole.id,
    },
    {
      email: "pm@canyon.local",
      password: "Pm123456!",
      name: "Project Manager",
      roleId: pmRole.id,
    },
    {
      email: "member@canyon.local",
      password: "Member123!",
      name: "Team Member",
      roleId: memberRole.id,
    },
  ];

  for (const seed of seedUsers) {
    const [existing] = await db.select().from(users).where(eq(users.email, seed.email)).limit(1);
    if (existing) continue;

    const passwordHash = await bcrypt.hash(seed.password, 12);
    const [result] = await db.insert(users).values({
      email: seed.email,
      passwordHash,
      name: seed.name,
    });

    await db.insert(userRoles).values({
      userId: result.insertId,
      roleId: seed.roleId,
    });

    console.log(`Created user: ${seed.email}`);
  }

  console.log("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});