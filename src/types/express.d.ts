import type { RoleName } from "../lib/roles.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name: string;
        roles: RoleName[];
      };
    }
  }
}

export {};