import { Request, Response } from "express";
import { env } from "../../config/env";
import { security } from "../../config/security";
import { queryOne } from "../../config/db";
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

    return res.status(200).json({
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

    return res.status(200).json({
      token: result.token,
      user: result.user,
    });
  } catch (err: any) {
    const message = err?.message || "Login failed";
    const isInvalidCreds =
      message === "Invalid credentials" || message === "User is blocked";
    return res
      .status(isInvalidCreds ? 401 : 400)
      .json({
        error: {
          message: isInvalidCreds ? "Invalid email or password" : message,
        },
      });
  }
}

export async function meHandler(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  const user = await queryOne<{ id: string; name: string; email: string; role: string }>(
    "SELECT id, name, email, role FROM users WHERE id = ?",
    [req.user.sub]
  );
  if (!user) {
    return res.status(401).json({ error: { message: "Unauthorized" } });
  }

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
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
  try {
    const token = req.cookies?.refresh_token as string | undefined;
    if (token) {
      const opts: { path: string; domain?: string } = { path: "/" };
      if (env.cookieDomain) opts.domain = env.cookieDomain;
      res.clearCookie("refresh_token", opts);
    }
  } catch (_) {
    // ignore; always respond 200 so frontend can clear state
  }
  return res.status(200).json({ success: true });
}

