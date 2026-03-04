"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandler = registerHandler;
exports.loginHandler = loginHandler;
exports.meHandler = meHandler;
exports.refreshHandler = refreshHandler;
exports.logoutHandler = logoutHandler;
const env_1 = require("../../config/env");
const security_1 = require("../../config/security");
const db_1 = require("../../config/db");
const auth_service_1 = require("./auth.service");
async function registerHandler(req, res) {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res
                .status(400)
                .json({ error: { message: "name, email and password are required" } });
        }
        const result = await (0, auth_service_1.registerUser)({ name, email, password });
        res.cookie("refresh_token", result.refreshToken, {
            ...security_1.security.cookieOptions,
            maxAge: security_1.security.refreshTokenTtlSeconds * 1000,
        });
        return res.status(200).json({
            token: result.token,
            user: result.user,
        });
    }
    catch (err) {
        return res
            .status(400)
            .json({ error: { message: err?.message || "Registration failed" } });
    }
}
async function loginHandler(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: { message: "email and password are required" } });
        }
        const result = await (0, auth_service_1.loginUser)({ email, password });
        res.cookie("refresh_token", result.refreshToken, {
            ...security_1.security.cookieOptions,
            maxAge: security_1.security.refreshTokenTtlSeconds * 1000,
        });
        return res.status(200).json({
            token: result.token,
            user: result.user,
        });
    }
    catch (err) {
        const message = err?.message || "Login failed";
        const isInvalidCreds = message === "Invalid credentials" || message === "User is blocked";
        return res
            .status(isInvalidCreds ? 401 : 400)
            .json({
            error: {
                message: isInvalidCreds ? "Invalid email or password" : message,
            },
        });
    }
}
async function meHandler(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: { message: "Unauthorized" } });
    }
    const user = await db_1.prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { id: true, name: true, email: true, role: true },
    });
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
async function refreshHandler(req, res) {
    const token = req.cookies?.refresh_token;
    if (!token) {
        return res.status(401).json({ error: { message: "Missing refresh token" } });
    }
    const result = await (0, auth_service_1.refreshAccessToken)(token);
    if (!result) {
        return res.status(401).json({ error: { message: "Invalid refresh token" } });
    }
    return res.json({ token: result.token });
}
async function logoutHandler(req, res) {
    try {
        const token = req.cookies?.refresh_token;
        if (token) {
            const opts = { path: "/" };
            if (env_1.env.cookieDomain)
                opts.domain = env_1.env.cookieDomain;
            res.clearCookie("refresh_token", opts);
        }
    }
    catch (_) {
        // ignore; always respond 200 so frontend can clear state
    }
    return res.status(200).json({ success: true });
}
