import { Router } from "express";
import { db } from "@workspace/db";
import { financialInfoTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListFinancialInfoQueryParams,
  UpdateFinancialInfoParams,
  UpdateFinancialInfoBody,
  GetFinancialInfoParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const parsed = ListFinancialInfoQueryParams.safeParse(req.query);
    const { clientId, clientType } = parsed.success ? parsed.data : ({} as any);

    const conditions = [];
    if (clientId) conditions.push(eq(financialInfoTable.clientId, Number(clientId)));
    if (clientType) conditions.push(eq(financialInfoTable.clientType, clientType));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const records = await db.select().from(financialInfoTable).where(where).orderBy(financialInfoTable.clientId);
    res.json(records);
  } catch (err) {
    req.log.error({ err }, "Failed to list financial info");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:clientId", async (req, res) => {
  try {
    const { clientId } = GetFinancialInfoParams.parse({ clientId: Number(req.params.clientId) });
    const [record] = await db.select().from(financialInfoTable).where(eq(financialInfoTable.clientId, clientId));
    if (!record) {
      res.status(404).json({ error: "Financial info not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to get financial info");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:clientId", async (req, res) => {
  try {
    const { clientId } = UpdateFinancialInfoParams.parse({ clientId: Number(req.params.clientId) });
    const parsed = UpdateFinancialInfoBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }
    const [record] = await db
      .update(financialInfoTable)
      .set(parsed.data)
      .where(eq(financialInfoTable.clientId, clientId))
      .returning();
    if (!record) {
      res.status(404).json({ error: "Financial info not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to update financial info");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
