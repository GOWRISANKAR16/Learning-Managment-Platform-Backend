"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const dbError_1 = require("../utils/dbError");
function errorHandler(err, _req, res, _next) {
    console.error(err);
    if (res.headersSent) {
        return;
    }
    const isDbDown = (0, dbError_1.isDbConnectionError)(err);
    res.status(isDbDown ? 503 : 500).json({
        error: {
            message: isDbDown
                ? "Database temporarily unavailable"
                : "Internal server error",
        },
    });
}
