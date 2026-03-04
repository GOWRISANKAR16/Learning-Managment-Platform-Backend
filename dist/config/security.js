"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.security = void 0;
const env_1 = require("./env");
exports.security = {
    accessTokenTtlSeconds: 15 * 60,
    refreshTokenTtlSeconds: 30 * 24 * 60 * 60,
    jwtAccessSecret: env_1.env.jwtAccessSecret,
    jwtRefreshSecret: env_1.env.jwtRefreshSecret,
    cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        ...(env_1.env.cookieDomain && { domain: env_1.env.cookieDomain }),
    },
};
