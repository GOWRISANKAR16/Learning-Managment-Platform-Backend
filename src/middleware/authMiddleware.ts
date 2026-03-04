import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthPayload {
  sub: string;
  email: string;
  role: "student" | "instructor" | "admin";
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret) as AuthPayload;
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
}

