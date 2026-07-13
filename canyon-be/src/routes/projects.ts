import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { projectMembers, projects } from "../db/schema.js";
import { parsePagination } from "../lib/pagination.js";
import { isAdmin } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireRoles } from "../middleware/rbac.js";
import {
  getAssignableUsers,
  getCandidateMembers,
  getProjectById,
  getProjectMembers,
  getProjectStats,
  listProjectsForUser,
  requireProjectAccess,
  requireProjectManage,
} from "../services/projects.js";
import { getUserById } from "../services/users.js";

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["planning", "active", "on_hold", "completed"]).optional(),
});

const updateProjectSchema = createProjectSchema.partial();

const memberSchema = z.object({
  userId: z.number().int().positive(),
  memberRole: z.enum(["manager", "member"]).default("member"),
});

const updateMemberSchema = z.object({
  memberRole: z.enum(["manager", "member"]),
});

const listProjectsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["planning", "active", "on_hold", "completed"]).optional(),
  search: z.string().optional(),
});

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const query = listProjectsQuerySchema.parse(req.query);
    const pagination = parsePagination(query);
    const { rows, total } = await listProjectsForUser(
      req.user!.id,
      req.user!.roles,
      pagination,
      { status: query.status, search: query.search }
    );

    const data = await Promise.all(
      rows.map(async (project) => {
        const stats = await getProjectStats(project.id);
        return { ...project, ...stats };
      })
    );

    res.json({ data, total, limit: pagination.limit, offset: pagination.offset });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireRoles("administrator", "project_manager"), async (req, res, next) => {
  try {
    const body = createProjectSchema.parse(req.body);
    const [result] = await db.insert(projects).values({
      name: body.name,
      description: body.description,
      status: body.status ?? "planning",
      createdBy: req.user!.id,
    });

    await db.insert(projectMembers).values({
      projectId: result.insertId,
      userId: req.user!.id,
      memberRole: "manager",
    });

    const project = await getProjectById(result.insertId);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/candidate-members", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    await requireProjectManage(req.user!.id, req.user!.roles, projectId);
    const candidates = await getCandidateMembers(projectId);
    res.json(candidates);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/assignable-users", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    await requireProjectAccess(req.user!.id, req.user!.roles, projectId);
    const assignable = await getAssignableUsers(projectId);
    res.json(assignable);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    await requireProjectAccess(req.user!.id, req.user!.roles, projectId);
    const project = await getProjectById(projectId);
    if (!project) throw new AppError(404, "Project not found");

    const members = await getProjectMembers(projectId);
    const stats = await getProjectStats(projectId);

    res.json({ ...project, members, ...stats });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    await requireProjectManage(req.user!.id, req.user!.roles, projectId);
    const body = updateProjectSchema.parse(req.body);

    await db.update(projects).set(body).where(eq(projects.id, projectId));
    const project = await getProjectById(projectId);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    if (!isAdmin(req.user!.roles)) {
      throw new AppError(403, "Only administrators can delete projects");
    }

    await db.delete(projects).where(eq(projects.id, projectId));
    res.json({ message: "Project deleted" });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/members", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    await requireProjectManage(req.user!.id, req.user!.roles, projectId);
    const body = memberSchema.parse(req.body);

    const user = await getUserById(body.userId);
    if (!user || !user.isActive) {
      throw new AppError(404, "User not found");
    }

    const [existing] = await db
      .select()
      .from(projectMembers)
      .where(
        and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, body.userId))
      )
      .limit(1);

    if (existing) {
      throw new AppError(409, "User is already a project member");
    }

    await db.insert(projectMembers).values({
      projectId,
      userId: body.userId,
      memberRole: body.memberRole,
    });

    const members = await getProjectMembers(projectId);
    res.status(201).json(members);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/members/:userId", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const userId = Number(req.params.userId);
    if (Number.isNaN(projectId) || Number.isNaN(userId)) {
      throw new AppError(400, "Invalid id");
    }

    await requireProjectManage(req.user!.id, req.user!.roles, projectId);
    const { memberRole } = updateMemberSchema.parse(req.body);

    const [existing] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new AppError(404, "Member not found");
    }

    await db
      .update(projectMembers)
      .set({ memberRole })
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

    const members = await getProjectMembers(projectId);
    res.json(members);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/members/:userId", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const userId = Number(req.params.userId);
    if (Number.isNaN(projectId) || Number.isNaN(userId)) {
      throw new AppError(400, "Invalid id");
    }

    await requireProjectManage(req.user!.id, req.user!.roles, projectId);

    await db
      .delete(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

    res.json({ message: "Member removed" });
  } catch (err) {
    next(err);
  }
});

export default router;