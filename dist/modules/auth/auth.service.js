"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.refreshAccessToken = refreshAccessToken;
exports.revokeRefreshToken = revokeRefreshToken;
const db_1 = require("../../config/db");
const password_1 = require("../../utils/password");
const jwt_1 = require("../../utils/jwt");
const security_1 = require("../../config/security");
const crypto_1 = __importDefault(require("crypto"));
async function registerUser(input) {
    const existing = await db_1.prisma.user.findUnique({
        where: { email: input.email },
    });
    if (existing) {
        throw new Error("Email already in use");
    }
    const passwordHash = await (0, password_1.hashPassword)(input.password);
    const user = await db_1.prisma.user.create({
        data: {
            name: input.name,
            email: input.email,
            passwordHash,
            role: "STUDENT",
            status: "ACTIVE",
        },
    });
    return issueTokensForUser(user.id, user.email, "student");
}
async function loginUser(input) {
    const user = await db_1.prisma.user.findUnique({
        where: { email: input.email },
    });
    if (!user) {
        throw new Error("Invalid credentials");
    }
    if (user.status === "BLOCKED") {
        throw new Error("User is blocked");
    }
    const ok = await (0, password_1.verifyPassword)(input.password, user.passwordHash);
    if (!ok) {
        throw new Error("Invalid credentials");
    }
    return issueTokensForUser(user.id, user.email, user.role.toLowerCase());
}
async function refreshAccessToken(jwtRefreshToken) {
    try {
        const decoded = (await Promise.resolve().then(() => __importStar(require("jsonwebtoken")))).default.verify(jwtRefreshToken, security_1.security.jwtRefreshSecret);
        const existing = await db_1.prisma.refreshToken.findUnique({
            where: { id: decoded.tid },
            include: { user: true },
        });
        if (!existing ||
            existing.revokedAt ||
            existing.expiresAt < new Date()) {
            return null;
        }
        const token = (0, jwt_1.signAccessToken)(existing.user.id, existing.user.email, existing.user.role.toLowerCase());
        return { token, refreshTokenId: existing.id };
    }
    catch {
        return null;
    }
}
async function revokeRefreshToken(rawId) {
    await db_1.prisma.refreshToken.updateMany({
        where: { id: rawId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
async function issueTokensForUser(userId, email, role) {
    const token = (0, jwt_1.signAccessToken)(userId, email, role);
    const rawId = crypto_1.default.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + security_1.security.refreshTokenTtlSeconds * 1000);
    await db_1.prisma.refreshToken.create({
        data: {
            id: rawId,
            userId,
            tokenHash: rawId,
            expiresAt,
        },
    });
    const refreshToken = (0, jwt_1.signRefreshToken)(rawId);
    return {
        token,
        refreshToken,
        user: { id: userId, name: email.split("@")[0], email, role },
    };
}
