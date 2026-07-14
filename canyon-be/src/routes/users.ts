import { Router } from "express";
import { z } from "zod";
import { parsePagination } from "../lib/pagination.js";
import { ROLE_NAMES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireRoles } from "../middleware/rbac.js";
import {
  createUser,
  deactivateUser,
  getUserForAdmin,
  listUsersForAdmin,
  updateUser,
} from "../services/users.js";

const router = Router();

const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255),
  roles: z.array(z.enum(ROLE_NAMES)).min(1),
});

const updateUserSchema = z.object({
  email: z.email().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
  roles: z.array(z.enum(ROLE_NAMES)).min(1).optional(),
});

const listUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

router.use(requireAuth, requireRoles("administrator"));

router.get("/", async (req, res, next) => {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const pagination = parsePagination(query);
    const { rows, total } = await listUsersForAdmin(req.user!.roles, pagination, {
      search: query.search,
      isActive: query.isActive,
    });
    res.json({ data: rows, total, limit: pagination.limit, offset: pagination.offset });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      throw new AppError(400, "Invalid user id");
    }

    const user = await getUserForAdmin(req.user!.roles, userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const user = await createUser(req.user!.roles, body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      throw new AppError(400, "Invalid user id");
    }

    const body = updateUserSchema.parse(req.body);
    const user = await updateUser(req.user!.roles, userId, body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      throw new AppError(400, "Invalid user id");
    }

    const result = await deactivateUser(req.user!.id, req.user!.roles, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
