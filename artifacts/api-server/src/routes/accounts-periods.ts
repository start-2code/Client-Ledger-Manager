import { Router } from "express";
import { db } from "@workspace/db";
import { accountsPeriodsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { clientId, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(Number(limit) || 50, 500);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (clientId) conditions.push(eq(accountsPeriodsTable.clientId, Number(clientId)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [records, totalResult] = await Promise.all([
      db.select().from(accountsPeriodsTable).where(where).limit(limitNum).offset(offset),
      db.select({ count: count() }).from(accountsPeriodsTable).where(where),
    ]);

    res.json({ accountsPeriods: records, total: Number(totalResult[0]?.count ?? 0), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "Failed to list accounts periods");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:clientId", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const records = await db.select().from(accountsPeriodsTable).where(eq(accountsPeriodsTable.clientId, clientId));
    res.json({ accountsPeriods: records });
  } catch (err) {
    req.log.error({ err }, "Failed to get accounts periods for client");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
