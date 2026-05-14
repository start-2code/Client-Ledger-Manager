import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable } from "@workspace/db";
import { eq, and, ilike, lte, ne, count } from "drizzle-orm";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  GetTaskParams,
} from "@workspace/api-zod";

const router = Router();

function withIsOverdue(task: typeof tasksTable.$inferSelect) {
  const today = new Date().toISOString().split("T")[0];
  return {
    ...task,
    isOverdue: task.dueDate ? task.dueDate < today && task.taskStatus !== "Complete" : false,
  };
}

router.get("/", async (req, res) => {
  try {
    const parsed = ListTasksQueryParams.safeParse(req.query);
    const { clientId, status, activityType, assignedTo, overdue, page = 1, limit = 50 } =
      parsed.success ? parsed.data : ({} as any);

    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 50, 500);
    const offset = (pageNum - 1) * limitNum;
    const today = new Date().toISOString().split("T")[0];

    const conditions = [];
    if (clientId) conditions.push(eq(tasksTable.clientId, Number(clientId)));
    if (status) conditions.push(eq(tasksTable.taskStatus, status));
    if (activityType) conditions.push(ilike(tasksTable.activityType, `%${activityType}%`));
    if (assignedTo) conditions.push(ilike(tasksTable.assignedTo, `%${assignedTo}%`));
    if (overdue === true || overdue === "true") {
      conditions.push(lte(tasksTable.dueDate, today));
      conditions.push(ne(tasksTable.taskStatus, "Complete"));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [tasks, totalResult] = await Promise.all([
      db.select().from(tasksTable).where(where).limit(limitNum).offset(offset).orderBy(tasksTable.dueDate),
      db.select({ count: count() }).from(tasksTable).where(where),
    ]);

    res.json({
      tasks: tasks.map(withIsOverdue),
      total: Number(totalResult[0]?.count ?? 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateTaskBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }
    const [task] = await db.insert(tasksTable).values(parsed.data as any).returning();
    res.status(201).json(withIsOverdue(task));
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = GetTaskParams.parse({ id: Number(req.params.id) });
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(withIsOverdue(task));
  } catch (err) {
    req.log.error({ err }, "Failed to get task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = UpdateTaskParams.parse({ id: Number(req.params.id) });
    const parsed = UpdateTaskBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }
    const [task] = await db.update(tasksTable).set(parsed.data as any).where(eq(tasksTable.id, id)).returning();
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(withIsOverdue(task));
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteTaskParams.parse({ id: Number(req.params.id) });
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete task");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
