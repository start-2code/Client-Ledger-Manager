import { Router } from "express";
import { db } from "@workspace/db";
import { companiesHouseTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/:clientId", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const [record] = await db.select().from(companiesHouseTable).where(eq(companiesHouseTable.clientId, clientId));
    res.json({ companiesHouse: record ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to get Companies House data for client");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
