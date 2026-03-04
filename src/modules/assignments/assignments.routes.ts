import { Router } from "express";
import { prisma } from "../../config/db";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/authMiddleware";
import { requireRole } from "../../middleware/roleMiddleware";

export const assignmentsRouter = Router();

assignmentsRouter.use(authMiddleware);

assignmentsRouter.get(
  "/users/:userId/assignments",
  async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const assignments = await prisma.assignment.findMany();
    res.json(assignments);
  }
);

assignmentsRouter.get(
  "/assignments/:assignmentId",
  async (_req: AuthenticatedRequest, res) => {
    const assignment = await prisma.assignment.findUnique({
      where: { id: _req.params.assignmentId },
    });
    if (!assignment) {
      return res
        .status(404)
        .json({ error: { message: "Assignment not found" } });
    }
    res.json(assignment);
  }
);

assignmentsRouter.get(
  "/assignments/:assignmentId/submissions/:userId",
  async (req: AuthenticatedRequest, res) => {
    const { assignmentId, userId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const submission = await prisma.submission.findUnique({
      where: {
        assignmentId_userId: { assignmentId, userId },
      },
    });

    if (!submission) {
      return res.status(404).json({ error: { message: "Not found" } });
    }

    res.json(submission);
  }
);

assignmentsRouter.post(
  "/assignments/:assignmentId/submissions",
  async (req: AuthenticatedRequest, res) => {
    const { assignmentId } = req.params;
    const userId = req.user!.sub;
    const { content } = req.body as { content: string };

    const now = new Date();

    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_userId: { assignmentId, userId },
      },
      update: {
        submittedAt: now,
        content,
        status: "SUBMITTED",
      },
      create: {
        assignmentId,
        userId,
        submittedAt: now,
        content,
        status: "SUBMITTED",
      },
    });

    res.status(201).json({ submission });
  }
);

// Admin / instructor
export const adminAssignmentsRouter = Router();

adminAssignmentsRouter.use(authMiddleware, requireRole("admin", "instructor"));

adminAssignmentsRouter.get("/", async (_req, res) => {
  const assignments = await prisma.assignment.findMany();
  res.json(assignments);
});

adminAssignmentsRouter.post("/", async (req, res) => {
  const { courseId, title, deadline, description } = req.body;
  const assignment = await prisma.assignment.create({
    data: {
      courseId,
      title,
      deadline: new Date(deadline),
      description,
    },
  });
  res.status(201).json(assignment);
});

adminAssignmentsRouter.put("/:assignmentId", async (req, res) => {
  const { assignmentId } = req.params;
  const { courseId, title, deadline, description } = req.body;

  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      courseId,
      title,
      deadline: deadline ? new Date(deadline) : undefined,
      description,
    },
  });

  res.json(assignment);
});

adminAssignmentsRouter.delete("/:assignmentId", async (req, res) => {
  const { assignmentId } = req.params;
  await prisma.assignment.delete({ where: { id: assignmentId } });
  res.status(204).send();
});

