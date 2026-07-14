import { Router } from "express";
import { z } from "zod";
import { parsePagination } from "../lib/pagination.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireRoles } from "../middleware/rbac.js";
import {
  addProjectMember,
  createProject,
  deleteProject,
  getAssignableUsers,
  getCandidateMembers,
  getProjectDetail,
  getProjectStats,
  listProjectsForUser,
  removeProjectMember,
  requireProjectAccess,
  requireProjectManage,
  updateProject,
  updateProjectMember,
} from "../services/projects.js";

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
    const project = await createProject(req.user!.id, req.user!.roles, body);
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

    const project = await getProjectDetail(req.user!.id, req.user!.roles, projectId);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    const body = updateProjectSchema.parse(req.body);
    const project = await updateProject(req.user!.id, req.user!.roles, projectId, body);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    const result = await deleteProject(req.user!.id, req.user!.roles, projectId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/members", async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    const body = memberSchema.parse(req.body);
    const members = await addProjectMember(req.user!.id, req.user!.roles, projectId, body);
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

    const { memberRole } = updateMemberSchema.parse(req.body);
    const members = await updateProjectMember(
      req.user!.id,
      req.user!.roles,
      projectId,
      userId,
      memberRole
    );
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

    const result = await removeProjectMember(
      req.user!.id,
      req.user!.roles,
      projectId,
      userId
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
