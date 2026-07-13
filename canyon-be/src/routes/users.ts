import { hashPassword } from "../lib/password.js";
import { eq, inArray } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { roles, userRoles, users } from "../db/schema.js";
import { parsePagination } from "../lib/pagination.js";
import { ROLE_NAMES } from "../lib/roles.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/errorHandler.js";
import { requireRoles } from "../middleware/rbac.js";
import { revokeAllUserTokens } from "../services/tokens.js";
import {
  formatUser,
  getUserByEmail,
  getUserById,
  getUserRoles,
  listUsers,
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
    const { rows, total } = await listUsers(pagination, {
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

    const user = await getUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    res.json(await formatUser(user));
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const existing = await getUserByEmail(body.email);
    if (existing) {
      throw new AppError(409, "Email already in use");
    }

    const passwordHash = await hashPassword(body.password);
    const [result] = await db.insert(users).values({
      email: body.email,
      passwordHash,
      name: body.name,
    });

    const roleRows = await db
      .select()
      .from(roles)
      .where(inArray(roles.name, body.roles));

    if (roleRows.length !== body.roles.length) {
      throw new AppError(400, "One or more roles are invalid");
    }

    await db.insert(userRoles).values(
      roleRows.map((role) => ({
        userId: result.insertId,
        roleId: role.id,
      }))
    );

    res.status(201).json({
      id: result.insertId,
      email: body.email,
      name: body.name,
      roles: body.roles,
    });
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
    const user = await getUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (body.email && body.email !== user.email) {
      const existing = await getUserByEmail(body.email);
      if (existing && existing.id !== userId) {
        throw new AppError(409, "Email already in use");
      }
    }

    const updates: Partial<typeof users.$inferInsert> = {};
    if (body.email) updates.email = body.email;
    if (body.name) updates.name = body.name;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.password) updates.passwordHash = await hashPassword(body.password);

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, userId));
    }

    if (body.password) {
      await revokeAllUserTokens(userId);
    }

    if (body.roles) {
      const roleRows = await db
        .select()
        .from(roles)
        .where(inArray(roles.name, body.roles));

      if (roleRows.length !== body.roles.length) {
        throw new AppError(400, "One or more roles are invalid");
      }

      await db.delete(userRoles).where(eq(userRoles.userId, userId));
      await db.insert(userRoles).values(
        roleRows.map((role) => ({
          userId,
          roleId: role.id,
        }))
      );
    }

    const updated = await getUserById(userId);
    const roleNames = body.roles ?? (await getUserRoles(userId));

    res.json({
      id: updated!.id,
      email: updated!.email,
      name: updated!.name,
      isActive: updated!.isActive,
      roles: roleNames,
    });
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

    if (userId === req.user!.id) {
      throw new AppError(400, "You cannot deactivate your own account");
    }

    const user = await getUserById(userId);
    if (!user) {
      throw new AppError(404, "User not found");
    }

    await db.update(users).set({ isActive: false }).where(eq(users.id, userId));
    await revokeAllUserTokens(userId);
    res.json({ message: "User deactivated" });
  } catch (err) {
    next(err);
  }
});

export default router;