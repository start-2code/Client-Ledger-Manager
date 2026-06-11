import { Router } from "express";
import { db } from "@workspace/db";
import { saReturnsTable, clientsTable } from "@workspace/db";
import { eq, and, ilike, count, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { clientId, taxYear, returnType, status, search, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(Number(limit) || 50, 500);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (clientId) conditions.push(eq(saReturnsTable.clientId, Number(clientId)));
    if (taxYear) conditions.push(eq(saReturnsTable.taxYear, taxYear));
    if (returnType) conditions.push(eq(saReturnsTable.returnType, returnType));
    if (status) conditions.push(eq(saReturnsTable.returnStatus, status));
    if (search) conditions.push(ilike(saReturnsTable.clientCode, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [records, totalResult] = await Promise.all([
      db.select().from(saReturnsTable).where(where).limit(limitNum).offset(offset)
        .orderBy(desc(saReturnsTable.taxYear), saReturnsTable.returnType),
      db.select({ count: count() }).from(saReturnsTable).where(where),
    ]);

    res.json({ saReturns: records, total: Number(totalResult[0]?.count ?? 0), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "Failed to list SA returns");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:clientId", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const records = await db.select().from(saReturnsTable)
      .where(eq(saReturnsTable.clientId, clientId))
      .orderBy(desc(saReturnsTable.taxYear), saReturnsTable.returnType);
    res.json({ saReturns: records });
  } catch (err) {
    req.log.error({ err }, "Failed to get SA returns for client");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
