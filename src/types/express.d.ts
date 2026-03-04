import type { AuthPayload } from "../middleware/authMiddleware";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthPayload;
  }
}

