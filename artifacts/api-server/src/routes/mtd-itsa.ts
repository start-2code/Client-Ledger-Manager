import { Router } from "express";
import { db } from "@workspace/db";
import { mtdItsaTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/:clientId", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const [record] = await db.select().from(mtdItsaTable).where(eq(mtdItsaTable.clientId, clientId));
    res.json({ mtdItsa: record ?? null });
  } catch (err) {
    req.log.error({ err }, "Failed to get MTD ITSA data for client");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
