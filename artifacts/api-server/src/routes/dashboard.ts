import { Router } from "express";
import { db } from "@workspace/db";
import {
  clientsTable,
  tasksTable,
  taxReturnsTable,
  taxReferencesTable,
  financialInfoTable,
  ctReturnsTable,
  accountsPeriodsTable,
  saReturnsTable,
} from "@workspace/db";
import { count, isNotNull, sum, sql } from "drizzle-orm";

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

router.get("/timeline", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const in7  = new Date(Date.now() + 7  * 86400000).toISOString().split("T")[0];
    const in14 = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
    const in60 = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

    const [
      ctDeadlineRows,
      ctOutstandingRows,
      accountsStatusRows,
      saByYearRows,
      taskTimelineRows,
      yearEndRows,
      confirmationRows,
      engagementRows,
    ] = await Promise.all([
      // 1. CT Payment Deadlines – next 90 days (ISO-format deadlines only)
      db.execute(sql`
        SELECT c.id AS "clientId", c.code AS "clientCode", c.name AS "clientName",
               ct.ct_payment_deadline AS deadline
        FROM ct_returns ct
        JOIN clients c ON c.id = ct.client_id
        WHERE ct.ct_payment_deadline ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND ct.ct_payment_deadline::date >= ${today}::date
          AND ct.ct_payment_deadline::date <= ${in90}::date
          AND (ct.return_filed_successfully IS NULL OR ct.return_filed_successfully = false)
        ORDER BY ct.ct_payment_deadline::date
        LIMIT 50
      `),

      // 3. CT Returns – period ended > 9 months ago, not yet filed (DD/MM/YYYY)
      db.execute(sql`
        SELECT c.id AS "clientId", c.code AS "clientCode", c.name AS "clientName",
               ct.ct_period_end AS "periodEnd",
               ROUND((CURRENT_DATE - TO_DATE(ct.ct_period_end,'DD/MM/YYYY')) / 30.0) AS "monthsSinceEnd"
        FROM ct_returns ct
        JOIN clients c ON c.id = ct.client_id
        WHERE ct.ct_period_end ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
          AND TO_DATE(ct.ct_period_end,'DD/MM/YYYY') < CURRENT_DATE - INTERVAL '9 months'
          AND (ct.return_filed_successfully IS NULL OR ct.return_filed_successfully = false)
        ORDER BY TO_DATE(ct.ct_period_end,'DD/MM/YYYY')
        LIMIT 50
      `),

      // 4. Accounts status breakdown
      db.execute(sql`
        SELECT
          accounts_status AS status,
          COUNT(*) AS count,
          COUNT(CASE
            WHEN period_end ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$'
             AND TO_DATE(period_end,'DD/MM/YYYY') < CURRENT_DATE - INTERVAL '9 months'
            THEN 1 END) AS "overdueCount"
        FROM accounts_periods
        GROUP BY accounts_status
        ORDER BY count DESC
      `),

      // 5. SA Returns by tax year
      db.execute(sql`
        SELECT
          tax_year AS "taxYear",
          COUNT(*) AS total,
          COUNT(CASE WHEN return_filed_successfully = true THEN 1 END) AS filed,
          COUNT(CASE WHEN (return_status IS NULL OR return_status = '') THEN 1 END) AS "notStarted"
        FROM sa_returns
        GROUP BY tax_year
        ORDER BY tax_year DESC
        LIMIT 10
      `),

      // 7. Tasks timeline
      db.execute(sql`
        SELECT id, task_name AS "taskName", client_name AS "clientName",
               client_id AS "clientId", due_date::text AS "dueDate",
               CASE
                 WHEN due_date < ${today}::date THEN 'overdue'
                 WHEN due_date <= ${in7}::date  THEN 'this_week'
                 WHEN due_date <= ${in14}::date THEN 'next_week'
               END AS band
        FROM tasks
        WHERE due_date IS NOT NULL
          AND task_status != 'Complete'
          AND due_date <= ${in14}::date
        ORDER BY due_date
        LIMIT 50
      `),

      // 2. Year-ends – check if usual_year_end has real date data
      db.execute(sql`
        SELECT COUNT(*) AS total,
               COUNT(CASE WHEN usual_year_end ~ '^[0-9]{2}/[0-9]{2}$' OR usual_year_end ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 1 END) AS has_dates
        FROM clients
        WHERE usual_year_end IS NOT NULL
      `),

      // 6. Confirmation statements – check if any data exists
      db.execute(sql`
        SELECT COUNT(*) AS total,
               COUNT(CASE WHEN confirmation_statement_date IS NOT NULL THEN 1 END) AS with_date
        FROM clients
      `),

      // 8. Client engagement
      db.execute(sql`
        SELECT COUNT(*) AS total,
               COUNT(CASE WHEN date_of_latest_engagement IS NOT NULL THEN 1 END) AS with_engagement
        FROM clients
      `),
    ]);

    // 1. CT Deadlines counts
    const deadlineItems = (ctDeadlineRows.rows as any[]).map((r) => ({
      clientId: Number(r.clientId),
      clientCode: r.clientCode,
      clientName: r.clientName,
      deadline: r.deadline,
    }));
    const within30 = deadlineItems.filter((d) => d.deadline <= in30).length;
    const within60 = deadlineItems.filter((d) => d.deadline <= in60).length;
    const within90 = deadlineItems.length;

    // 2. Year ends
    const yeRow = (yearEndRows.rows as any[])[0];
    const yearEndHasData = Number(yeRow?.has_dates ?? 0) > 0;

    // 6. Confirmation statements
    const confRow = (confirmationRows.rows as any[])[0];
    const confHasData = Number(confRow?.with_date ?? 0) > 0;

    // 8. Client engagement
    const engRow = (engagementRows.rows as any[])[0];
    const engHasData = Number(engRow?.with_engagement ?? 0) > 0;

    // 7. Tasks
    const taskItems = (taskTimelineRows.rows as any[]).map((r) => ({
      id: Number(r.id),
      taskName: r.taskName,
      clientName: r.clientName,
      clientId: r.clientId ? Number(r.clientId) : null,
      dueDate: r.dueDate,
      band: r.band,
    }));
    const overdueCount  = taskItems.filter((t) => t.band === "overdue").length;
    const thisWeekCount = taskItems.filter((t) => t.band === "this_week").length;
    const nextWeekCount = taskItems.filter((t) => t.band === "next_week").length;

    res.json({
      ctDeadlines: {
        within30,
        within60,
        within90,
        items: deadlineItems,
      },
      yearEnds: {
        hasData: yearEndHasData,
        thisMonth: 0,
        nextMonth: 0,
      },
      ctOutstanding: {
        total: (ctOutstandingRows.rows as any[]).length,
        items: (ctOutstandingRows.rows as any[]).map((r) => ({
          clientId: Number(r.clientId),
          clientCode: r.clientCode,
          clientName: r.clientName,
          periodEnd: r.periodEnd,
          monthsSinceEnd: Number(r.monthsSinceEnd ?? 0),
        })),
      },
      accountsStatus: (accountsStatusRows.rows as any[]).map((r) => ({
        status: r.status,
        count: Number(r.count),
        overdueCount: Number(r.overdueCount ?? 0),
      })),
      saByYear: (saByYearRows.rows as any[]).map((r) => ({
        taxYear: String(r.taxYear),
        total: Number(r.total),
        filed: Number(r.filed),
        notStarted: Number(r.notStarted),
      })),
      confirmationStatements: {
        hasData: confHasData,
        dueSoon: 0,
        overdue: 0,
      },
      taskTimeline: {
        overdue: overdueCount,
        thisWeek: thisWeekCount,
        nextWeek: nextWeekCount,
        items: taskItems,
      },
      clientEngagement: {
        hasData: engHasData,
        notEngagedCount: 0,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard timeline");
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
