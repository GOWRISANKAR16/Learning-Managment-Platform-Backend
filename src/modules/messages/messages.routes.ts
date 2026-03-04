import { Router } from "express";
import { prisma } from "../../config/db";
import { authMiddleware, AuthenticatedRequest } from "../../middleware/authMiddleware";

export const messagesRouter = Router();

messagesRouter.use(authMiddleware);

messagesRouter.get(
  "/users/:userId/threads",
  async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const threads = await prisma.thread.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    res.json(threads);
  }
);

messagesRouter.post(
  "/users/:userId/threads",
  async (req: AuthenticatedRequest, res) => {
    const { userId } = req.params;
    if (req.user?.sub !== userId && req.user?.role !== "admin") {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    const { courseId, courseTitle } = req.body as {
      courseId: string;
      courseTitle: string;
    };

    const thread = await prisma.thread.create({
      data: {
        userId,
        courseId,
        courseTitle,
      },
    });

    res.status(201).json(thread);
  }
);

messagesRouter.get("/threads/:threadId/messages", async (req, res) => {
  const thread = await prisma.thread.findUnique({
    where: { id: req.params.threadId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!thread) {
    return res.status(404).json({ error: { message: "Thread not found" } });
  }

  res.json(thread.messages);
});

messagesRouter.post(
  "/threads/:threadId/messages",
  async (req: AuthenticatedRequest, res) => {
    const thread = await prisma.thread.findUnique({
      where: { id: req.params.threadId },
    });

    if (!thread) {
      return res.status(404).json({ error: { message: "Thread not found" } });
    }

    const from =
      req.user?.role === "student" ? "STUDENT" : ("INSTRUCTOR" as const);

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        from,
        text: (req.body as { text: string }).text,
        isRead: from === "STUDENT",
        senderId: req.user?.sub,
      },
    });

    res.status(201).json({ message });
  }
);

messagesRouter.patch(
  "/threads/:threadId/read",
  async (req: AuthenticatedRequest, res) => {
    const thread = await prisma.thread.findUnique({
      where: { id: req.params.threadId },
    });

    if (!thread) {
      return res.status(404).json({ error: { message: "Thread not found" } });
    }

    if (req.user?.sub !== thread.userId && req.user?.role !== "admin") {
      return res.status(403).json({ error: { message: "Forbidden" } });
    }

    await prisma.message.updateMany({
      where: {
        threadId: thread.id,
        from: "INSTRUCTOR",
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({ success: true });
  }
);

