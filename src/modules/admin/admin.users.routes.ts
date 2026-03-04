import { Router } from "express";
import { prisma } from "../../config/db";
import { authMiddleware } from "../../middleware/authMiddleware";
import { requireRole } from "../../middleware/roleMiddleware";

export const adminUsersRouter = Router();

adminUsersRouter.use(authMiddleware, requireRole("admin"));

adminUsersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });
  res.json(users);
});

adminUsersRouter.put("/:userId", async (req, res) => {
  const { userId } = req.params;
  const { role, status } = req.body as {
    role?: "student" | "instructor" | "admin";
    status?: "active" | "blocked";
  };

  const data: any = {};
  if (role) {
    data.role = role.toUpperCase();
  }
  if (status) {
    data.status = status.toUpperCase();
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
    status: user.status.toLowerCase(),
  });
});

adminUsersRouter.delete("/:userId", async (req, res) => {
  const { userId } = req.params;
  await prisma.user.delete({ where: { id: userId } });
  res.status(204).send();
});

