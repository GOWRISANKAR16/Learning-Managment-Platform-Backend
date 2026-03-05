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
function uuid() {
    return crypto_1.default.randomUUID();
}
async function registerUser(input) {
    const existing = await (0, db_1.queryOne)("SELECT id FROM users WHERE email = ?", [input.email]);
    if (existing) {
        throw new Error("Email already in use");
    }
    const passwordHash = await (0, password_1.hashPassword)(input.password);
    const id = uuid();
    await db_1.pool.execute("INSERT INTO users (id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'student', 'active')", [id, input.name, input.email, passwordHash]);
    return issueTokensForUser(id, input.email, input.name, "student");
}
async function loginUser(input) {
    const user = await (0, db_1.queryOne)("SELECT * FROM users WHERE email = ?", [
        input.email,
    ]);
    if (!user) {
        throw new Error("Invalid credentials");
    }
    if (user.status === "blocked") {
        throw new Error("User is blocked");
    }
    const ok = await (0, password_1.verifyPassword)(input.password, user.password_hash);
    if (!ok) {
        throw new Error("Invalid credentials");
    }
    const role = user.role.toLowerCase();
    return issueTokensForUser(user.id, user.email, user.name, role);
}
async function refreshAccessToken(jwtRefreshToken) {
    try {
        const jwt = await Promise.resolve().then(() => __importStar(require("jsonwebtoken")));
        const decoded = jwt.default.verify(jwtRefreshToken, security_1.security.jwtRefreshSecret);
        const rows = await (0, db_1.query)("SELECT r.user_id, r.expires_at, r.revoked_at, u.email, u.name, u.role FROM refresh_tokens r JOIN users u ON u.id = r.user_id WHERE r.id = ?", [decoded.tid]);
        const row = rows && rows[0];
        if (!row || row.revoked_at || new Date(row.expires_at) < new Date()) {
            return null;
        }
        const role = row.role.toLowerCase();
        const token = (0, jwt_1.signAccessToken)(row.user_id, row.email, role);
        return { token, refreshTokenId: decoded.tid };
    }
    catch {
        return null;
    }
}
async function revokeRefreshToken(rawId) {
    await db_1.pool.execute("UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP(3) WHERE id = ? AND revoked_at IS NULL", [rawId]);
}
async function issueTokensForUser(userId, email, name, role) {
    const token = (0, jwt_1.signAccessToken)(userId, email, role);
    const rawId = uuid();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + security_1.security.refreshTokenTtlSeconds * 1000);
    await db_1.pool.execute("INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)", [rawId, userId, rawId, expiresAt]);
    const refreshToken = (0, jwt_1.signRefreshToken)(rawId);
    return {
        token,
        refreshToken,
        user: { id: userId, name, email, role },
    };
}
