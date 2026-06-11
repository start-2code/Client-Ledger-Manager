import { Router } from "express";
import { db } from "@workspace/db";
import { clientFeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/:clientId", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const [record] = await db.select().from(clientFeesTable).where(eq(clientFeesTable.clientId, clientId));
    res.json({ fees: record ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to get fees for client");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
