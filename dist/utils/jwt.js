"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const security_1 = require("../config/security");
function signAccessToken(userId, email, role) {
    return jsonwebtoken_1.default.sign({ sub: userId, email, role }, env_1.env.jwtAccessSecret, { expiresIn: security_1.security.accessTokenTtlSeconds });
}
function signRefreshToken(rawTokenId) {
    return jsonwebtoken_1.default.sign({ tid: rawTokenId }, env_1.env.jwtRefreshSecret, { expiresIn: security_1.security.refreshTokenTtlSeconds });
}
