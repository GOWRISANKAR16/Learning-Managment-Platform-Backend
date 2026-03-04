import { Router } from "express";
import { authMiddleware } from "../../middleware/authMiddleware";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
} from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", registerHandler);
authRouter.post("/login", loginHandler);
authRouter.post("/logout", authMiddleware, logoutHandler);
authRouter.get("/me", authMiddleware, meHandler);
authRouter.post("/refresh", refreshHandler);

