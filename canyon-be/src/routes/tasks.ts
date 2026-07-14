import { Router } from "express";
import { z } from "zod";
import { parsePagination } from "../lib/pagination.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasksForProject,
  listTasksForUser,
  requireTaskView,
  updateTask,
  updateTaskStatus,
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

    const body = createTaskSchema.parse(req.body);
    const task = await createTask(req.user!.id, req.user!.roles, projectId, body);
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

    const body = updateTaskSchema.parse(req.body);
    const task = await updateTask(req.user!.id, req.user!.roles, taskId, body);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) throw new AppError(400, "Invalid task id");

    const { status } = statusSchema.parse(req.body);
    const task = await updateTaskStatus(req.user!.id, req.user!.roles, taskId, status);
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    if (Number.isNaN(taskId)) throw new AppError(400, "Invalid task id");

    const result = await deleteTask(req.user!.id, req.user!.roles, taskId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
