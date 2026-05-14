import { Router } from "express";
import { db } from "@workspace/db";
import { taxReturnsTable } from "@workspace/db";
import { eq, and, ilike, count } from "drizzle-orm";
import {
  ListTaxReturnsQueryParams,
  UpdateTaxReturnParams,
  UpdateTaxReturnBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const parsed = ListTaxReturnsQueryParams.safeParse(req.query);
    const { clientId, status, clientType, search, page = 1, limit = 50 } =
      parsed.success ? parsed.data : ({} as any);

    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 50, 500);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (clientId) conditions.push(eq(taxReturnsTable.clientId, Number(clientId)));
    if (status) conditions.push(eq(taxReturnsTable.taxReturnStatus, status));
    if (clientType) conditions.push(eq(taxReturnsTable.clientType, clientType));
    if (search) conditions.push(ilike(taxReturnsTable.clientName, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [records, totalResult] = await Promise.all([
      db.select().from(taxReturnsTable).where(where).limit(limitNum).offset(offset).orderBy(taxReturnsTable.clientName),
      db.select({ count: count() }).from(taxReturnsTable).where(where),
    ]);

    res.json({
      taxReturns: records,
      total: Number(totalResult[0]?.count ?? 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list tax returns");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = UpdateTaxReturnParams.parse({ id: Number(req.params.id) });
    const parsed = UpdateTaxReturnBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }
    const [record] = await db
      .update(taxReturnsTable)
      .set(parsed.data)
      .where(eq(taxReturnsTable.id, id))
      .returning();
    if (!record) {
      res.status(404).json({ error: "Tax return not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to update tax return");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
