import { Request, Response } from "express";
import { env } from "../../config/env";
import { security } from "../../config/security";
import {
  loginUser,
  refreshAccessToken,
  registerUser,
  revokeRefreshToken,
} from "./auth.service";
import { AuthenticatedRequest } from "../../middleware/authMiddleware";

export async function registerHandler(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: { message: "name, email and password are required" } });
    }

    const result = await registerUser({ name, email, password });

    res.cookie("refresh_token", result.refreshToken, {
      ...security.cookieOptions,
      maxAge: security.refreshTokenTtlSeconds * 1000,
    });

    return res.json({
      token: result.token,
      user: result.user,
    });
  } catch (err: any) {
    return res
      .status(400)
      .json({ error: { message: err?.message || "Registration failed" } });
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: { message: "email and password are required" } });
    }

    const result = await loginUser({ email, password });

    res.cookie("refresh_token", result.refreshToken, {
      ...security.cookieOptions,
      maxAge: security.refreshTokenTtlSeconds * 1000,
    });

    return res.json({
      token: result.token,
      user: result.user,
    });
  } catch (err: any) {
    return res
      .status(400)
      .json({ error: { message: err?.message || "Login failed" } });
  }
}

export async function meHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  return res.json({
    id: req.user.sub,
    email: req.user.email,
    role: req.user.role,
  });
}

export async function refreshHandler(req: Request, res: Response) {
  const token = req.cookies?.refresh_token as string | undefined;
  if (!token) {
    return res.status(401).json({ error: { message: "Missing refresh token" } });
  }

  const result = await refreshAccessToken(token);
  if (!result) {
    return res.status(401).json({ error: { message: "Invalid refresh token" } });
  }

  return res.json({ token: result.token });
}

export async function logoutHandler(req: Request, res: Response) {
  const token = req.cookies?.refresh_token as string | undefined;
  if (token) {
    res.clearCookie("refresh_token", {
      domain: env.cookieDomain,
      path: "/",
    });
  }

  return res.json({ success: true });
}

