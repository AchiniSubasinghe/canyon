import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { tasks } from "../db/schema.js";
import { isAdmin, isProjectManager } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireProjectAccess, requireProjectManage } from "../services/projects.js";
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

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const result = await listTasksForUser(req.user!.id, req.user!.roles);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/project/:projectId", async (req, res, next) => {
  try {
    const projectId = Number(req.params.projectId);
    if (Number.isNaN(projectId)) throw new AppError(400, "Invalid project id");

    const result = await listTasksForProject(req.user!.id, req.user!.roles, projectId);
    res.json(result);
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

    const [result] = await db.insert(tasks).values({
      projectId,
      title: body.title,
      description: body.description,
      status: body.status ?? "todo",
      priority: body.priority ?? "medium",
      assignedTo: body.assignedTo ?? null,
      createdBy: req.user!.id,
      dueDate: body.dueDate ?? null,
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

    await db.update(tasks).set(body).where(eq(tasks.id, taskId));
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