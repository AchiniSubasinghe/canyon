import type { NextFunction, Request, Response } from "express";
import { hasAnyRole, type RoleName } from "../lib/roles.js";
import { AppError } from "./errorHandler.js";

export function requireRoles(...roles: RoleName[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, "Authentication required"));
      return;
    }

    if (!hasAnyRole(req.user.roles, roles)) {
      next(new AppError(403, "Insufficient permissions"));
      return;
    }

    next();
  };
}