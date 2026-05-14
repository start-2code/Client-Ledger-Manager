import { Router } from "express";
import { db } from "@workspace/db";
import {
  clientsTable,
  tasksTable,
  taxReturnsTable,
  taxReferencesTable,
  financialInfoTable,
} from "@workspace/db";
import { count, lte, ne, isNotNull, sum, sql } from "drizzle-orm";

const router = Router();

router.get("/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [
      totalClientsResult,
      overdueTasksResult,
      totalTasksResult,
      tasksByStatusResult,
      clientsByTypeResult,
      taxReturnsByStatusResult,
      totalTurnoverResult,
      vatRegisteredResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(clientsTable),
      db
        .select({ count: count() })
        .from(tasksTable)
        .where(
          sql`${tasksTable.dueDate} < ${today} AND ${tasksTable.taskStatus} != 'Complete'`
        ),
      db.select({ count: count() }).from(tasksTable),
      db
        .select({ status: tasksTable.taskStatus, count: count() })
        .from(tasksTable)
        .groupBy(tasksTable.taskStatus),
      db
        .select({ type: clientsTable.type, count: count() })
        .from(clientsTable)
        .groupBy(clientsTable.type),
      db
        .select({ status: taxReturnsTable.taxReturnStatus, count: count() })
        .from(taxReturnsTable)
        .groupBy(taxReturnsTable.taxReturnStatus),
      db.select({ total: sum(financialInfoTable.turnover) }).from(financialInfoTable),
      db
        .select({ count: count() })
        .from(taxReferencesTable)
        .where(isNotNull(taxReferencesTable.vatRegNo)),
    ]);

    const activeClientsResult = await db
      .select({ count: count() })
      .from(taxReferencesTable)
      .where(sql`${taxReferencesTable.engagementStatus} = 'Active'`);

    res.json({
      totalClients: Number(totalClientsResult[0]?.count ?? 0),
      overdueTasksCount: Number(overdueTasksResult[0]?.count ?? 0),
      activeClientsCount: Number(activeClientsResult[0]?.count ?? 0),
      totalTasks: Number(totalTasksResult[0]?.count ?? 0),
      tasksByStatus: tasksByStatusResult.map((r) => ({
        label: r.status ?? "Unknown",
        count: Number(r.count),
      })),
      clientsByType: clientsByTypeResult.map((r) => ({
        label: r.type ?? "Unknown",
        count: Number(r.count),
      })),
      taxReturnsByStatus: taxReturnsByStatusResult.map((r) => ({
        label: r.status ?? "Unknown",
        count: Number(r.count),
      })),
      totalTurnover: totalTurnoverResult[0]?.total ? Number(totalTurnoverResult[0].total) : null,
      vatRegisteredCount: Number(vatRegisteredResult[0]?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/overdue-tasks", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const today = new Date().toISOString().split("T")[0];

    const tasks = await db
      .select()
      .from(tasksTable)
      .where(sql`${tasksTable.dueDate} < ${today} AND ${tasksTable.taskStatus} != 'Complete'`)
      .orderBy(tasksTable.dueDate)
      .limit(limit);

    res.json(
      tasks.map((t) => ({
        ...t,
        isOverdue: true,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get overdue tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/recent-clients", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const clients = await db
      .select()
      .from(clientsTable)
      .orderBy(sql`${clientsTable.createdAt} DESC`)
      .limit(limit);
    res.json(clients);
  } catch (err) {
    req.log.error({ err }, "Failed to get recent clients");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
