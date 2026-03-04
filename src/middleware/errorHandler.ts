import { NextFunction, Request, Response } from "express";
import { isDbConnectionError } from "../utils/dbError";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  if (res.headersSent) {
    return;
  }

  const isDbDown = isDbConnectionError(err);
  res.status(isDbDown ? 503 : 500).json({
    error: {
      message: isDbDown
        ? "Database temporarily unavailable"
        : "Internal server error",
    },
  });
}

