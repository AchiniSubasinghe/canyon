import { hashPassword } from "../lib/password.js";
import { eq } from "drizzle-orm";
import { db } from "./index.js";
import { projectMembers, projects, roles, tasks, userRoles, users } from "./schema.js";

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

  const userIds: Record<string, number> = {};

  for (const seed of seedUsers) {
    const [existing] = await db.select().from(users).where(eq(users.email, seed.email)).limit(1);
    if (existing) {
      userIds[seed.email] = existing.id;
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
      roleId: seed.roleId,
    });

    userIds[seed.email] = result.insertId;
    console.log(`Created user: ${seed.email}`);
  }

  const [existingProject] = await db
    .select()
    .from(projects)
    .where(eq(projects.name, "Platform Launch"))
    .limit(1);

  let projectId: number;

  if (existingProject) {
    projectId = existingProject.id;
  } else {
    const [result] = await db.insert(projects).values({
      name: "Platform Launch",
      description: "Demo project for onboarding and task workflows.",
      status: "active",
      createdBy: userIds["pm@canyon.local"]!,
    });
    projectId = result.insertId;
    console.log("Created demo project: Platform Launch");
  }

  const memberPairs = [
    { userId: userIds["pm@canyon.local"]!, memberRole: "manager" as const },
    { userId: userIds["member@canyon.local"]!, memberRole: "member" as const },
  ];

  for (const pair of memberPairs) {
    const members = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    const alreadyMember = members.some((m) => m.userId === pair.userId);
    if (!alreadyMember) {
      await db.insert(projectMembers).values({
        projectId,
        userId: pair.userId,
        memberRole: pair.memberRole,
      });
    }
  }

  const demoTasks = [
    {
      title: "Define API contracts",
      description: "Document REST endpoints and shared types.",
      status: "done" as const,
      priority: "high" as const,
      assignedTo: userIds["pm@canyon.local"]!,
    },
    {
      title: "Build auth middleware",
      description: "JWT access tokens with refresh rotation.",
      status: "in_progress" as const,
      priority: "urgent" as const,
      assignedTo: userIds["member@canyon.local"]!,
    },
    {
      title: "Design dashboard layout",
      description: "Wireframe metrics and task table.",
      status: "review" as const,
      priority: "medium" as const,
      assignedTo: userIds["member@canyon.local"]!,
    },
    {
      title: "Set up CI pipeline",
      description: "GitHub Actions for backend tests and frontend build.",
      status: "todo" as const,
      priority: "low" as const,
      assignedTo: userIds["pm@canyon.local"]!,
    },
    {
      title: "Write onboarding docs",
      description: "README with demo credentials and setup steps.",
      status: "todo" as const,
      priority: "medium" as const,
      assignedTo: null,
    },
  ];

  for (const task of demoTasks) {
    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.title, task.title))
      .limit(1);

    if (existing) continue;

    await db.insert(tasks).values({
      projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignedTo: task.assignedTo,
      createdBy: userIds["pm@canyon.local"]!,
    });
    console.log(`Created task: ${task.title}`);
  }

  console.log("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});