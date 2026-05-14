import { Router } from "express";
import { db } from "@workspace/db";
import { taxReferencesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListTaxReferencesQueryParams,
  UpdateTaxReferenceParams,
  UpdateTaxReferenceBody,
  GetTaxReferenceParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const parsed = ListTaxReferencesQueryParams.safeParse(req.query);
    const { clientId, engagementStatus, amlStatus } = parsed.success ? parsed.data : ({} as any);

    const conditions = [];
    if (clientId) conditions.push(eq(taxReferencesTable.clientId, Number(clientId)));
    if (engagementStatus) conditions.push(eq(taxReferencesTable.engagementStatus, engagementStatus));
    if (amlStatus) conditions.push(eq(taxReferencesTable.amlStatus, amlStatus));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const records = await db.select().from(taxReferencesTable).where(where).orderBy(taxReferencesTable.clientId);
    res.json(records);
  } catch (err) {
    req.log.error({ err }, "Failed to list tax references");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:clientId", async (req, res) => {
  try {
    const { clientId } = GetTaxReferenceParams.parse({ clientId: Number(req.params.clientId) });
    const [record] = await db.select().from(taxReferencesTable).where(eq(taxReferencesTable.clientId, clientId));
    if (!record) {
      res.status(404).json({ error: "Tax reference not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to get tax reference");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:clientId", async (req, res) => {
  try {
    const { clientId } = UpdateTaxReferenceParams.parse({ clientId: Number(req.params.clientId) });
    const parsed = UpdateTaxReferenceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }
    const [record] = await db
      .update(taxReferencesTable)
      .set(parsed.data)
      .where(eq(taxReferencesTable.clientId, clientId))
      .returning();
    if (!record) {
      res.status(404).json({ error: "Tax reference not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to update tax reference");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
