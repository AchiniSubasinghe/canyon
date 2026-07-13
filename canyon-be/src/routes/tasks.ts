import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { tasks } from "../db/schema.js";
import { isAdmin, isProjectManager } from "../lib/roles.js";
import { parsePagination } from "../lib/pagination.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireProjectManage, requireProjectMember } from "../services/projects.js";
import {
  canUpdateTaskStatus,
  getTaskById,
  listTasksForProject,
  listTasksForUser,
  requireTaskEdit,
  requireTaskView,
} from "../services/tasks.js";

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.number().int().positive().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const updateTaskSchema = createTaskSchema.partial();

const statusSchema = z.object({
  status: z.enum(["todo", "in_progress", "review", "done"]),
});

const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  projectId: z.coerce.number().int().positive().optional(),
});

function parseDueDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, "Invalid due date");
  }
  return date;
}

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const query = listTasksQuerySchema.parse(req.query);
    const pagination = parsePagination(query);
    const { rows, total } = await listTasksForUser(req.user!.id, req.user!.roles, pagination, {
      status: query.status,
      priority: query.priority,
      projectId: query.projectId,
    });
    res.json({ data: rows, total, limit: pagination.limit, offset: pagination.offset });
  } catch (err) {
    next(err);
  }
});

router.get("/project/:projectId", async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    const query = listTasksQuerySchema.parse(req.query);
    const pagination = parsePagination(query);
    const { rows, total } = await listTasksForProject(
      req.user!.id,
      req.user!.roles,
      projectId,
      pagination,
      { status: query.status, priority: query.priority }
    );
    res.json({ data: rows, total, limit: pagination.limit, offset: pagination.offset });
  } catch (err) {
    next(err);
  }
});

router.post("/project/:projectId", async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    const canCreate =
      isAdmin(req.user!.roles) ||
      isProjectManager(req.user!.roles);

    if (!canCreate) {
      throw new AppError(403, "You cannot create tasks");
    }

    await requireProjectManage(req.user!.id, req.user!.roles, projectId);
    const body = createTaskSchema.parse(req.body);

    if (body.assignedTo) {
      await requireProjectMember(projectId, body.assignedTo);
    }

    const [result] = await db.insert(tasks).values({
      projectId,
      title: body.title,
      description: body.description,
      status: body.status ?? "todo",
      priority: body.priority ?? "medium",
      assignedTo: body.assignedTo ?? null,
      createdBy: req.user!.id,
      dueDate: parseDueDate(body.dueDate) ?? null,
    });

    const task = await getTaskById(result.insertId);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) throw new AppError(400, "Invalid task id");

    await requireTaskView(req.user!.id, req.user!.roles, taskId);
    const task = await getTaskById(taskId);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) throw new AppError(400, "Invalid task id");

    await requireTaskEdit(req.user!.id, req.user!.roles, taskId);
    const body = updateTaskSchema.parse(req.body);

    const existing = await getTaskById(taskId);
    if (!existing) throw new AppError(404, "Task not found");

    if (body.assignedTo) {
      await requireProjectMember(existing.projectId, body.assignedTo);
    }

    const updates: {
      title?: string;
      description?: string | null;
      status?: "todo" | "in_progress" | "review" | "done";
      priority?: "low" | "medium" | "high" | "urgent";
      assignedTo?: number | null;
      dueDate?: Date | null;
    } = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;
    if (body.dueDate !== undefined) updates.dueDate = parseDueDate(body.dueDate) ?? null;

    await db.update(tasks).set(updates).where(eq(tasks.id, taskId));
    const task = await getTaskById(taskId);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) throw new AppError(400, "Invalid task id");

    const allowed = await canUpdateTaskStatus(req.user!.id, req.user!.roles, taskId);
    if (!allowed) throw new AppError(403, "You cannot update this task status");

    const { status } = statusSchema.parse(req.body);
    await db.update(tasks).set({ status }).where(eq(tasks.id, taskId));
    const task = await getTaskById(taskId);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) throw new AppError(400, "Invalid task id");

    const task = await getTaskById(taskId);
    if (!task) throw new AppError(404, "Task not found");

    await requireProjectManage(req.user!.id, req.user!.roles, task.projectId);
    await db.delete(tasks).where(eq(tasks.id, taskId));
    res.json({ message: "Task deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;