import { Router } from "express";
import { authRouter } from "../auth/auth.routes";
import { subjectsRouter } from "./subjects.routes";
import { videosRouter } from "./videos.routes";
import { apiProgressRouter } from "./progress.routes";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/subjects", subjectsRouter);
apiRouter.use("/videos", videosRouter);
apiRouter.use("/progress", apiProgressRouter);
