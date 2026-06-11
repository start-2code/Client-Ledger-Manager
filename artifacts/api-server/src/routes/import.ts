import { Router } from "express";
import multer from "multer";
import { parseTaxCalcZip } from "../lib/taxcalc-parser.js";
import { previewImport, runImport } from "../lib/taxcalc-importer.js";
import { db } from "@workspace/db";
import { importBatchesTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.post("/preview", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const parseResult = parseTaxCalcZip(req.file.buffer);
    if (parseResult.errors.length > 0 && parseResult.clients.size === 0) {
      return res.status(400).json({ error: "Failed to parse file", details: parseResult.errors });
    }
    const preview = await previewImport(parseResult.clients);
    return res.json({
      ...preview,
      fileCount: parseResult.fileCount,
      parseErrors: parseResult.errors,
    });
  } catch (err) {
    req.log.error({ err }, "Import preview failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/run", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse synchronously — this is fast (in-memory XLS parsing)
    const parseResult = parseTaxCalcZip(req.file.buffer);
    if (parseResult.errors.length > 0 && parseResult.clients.size === 0) {
      return res.status(400).json({ error: "Failed to parse file", details: parseResult.errors });
    }

    const filename = req.file.originalname;
    const importedBy = (req.body?.importedBy as string) ?? "admin";

    // Insert a pending batch record immediately so the client has an ID to poll
    const [batch] = await db
      .insert(importBatchesTable)
      .values({ filename, importedBy, status: "pending" })
      .returning({ id: importBatchesTable.id });

    // Return the batch ID right away — well within the proxy timeout
    res.status(202).json({ batchId: batch.id });

    // Run the actual import in the background after the response is sent
    const clients = parseResult.clients;
    void (async () => {
      try {
        await db
          .update(importBatchesTable)
          .set({ status: "running" })
          .where(eq(importBatchesTable.id, batch.id));

        const result = await runImport(clients, { importedBy, filename });

        await db
          .update(importBatchesTable)
          .set({
            status: result.errors.length > 0 ? "partial" : "success",
            totalClients: (result.clientsAdded ?? 0) + (result.clientsUpdated ?? 0),
            clientsAdded: result.clientsAdded ?? 0,
            clientsUpdated: result.clientsUpdated ?? 0,
            clientsRemoved: result.clientsRemoved ?? 0,
            saReturnsCount: result.saReturnsCount ?? 0,
            ctReturnsCount: result.ctReturnsCount ?? 0,
            accountsPeriodsCount: result.accountsPeriodsCount ?? 0,
            errorMessage: result.errors.length > 0 ? result.errors.slice(0, 5).join("; ") : null,
          })
          .where(eq(importBatchesTable.id, batch.id));

        logger.info({ batchId: batch.id, ...result }, "Background import completed");
      } catch (err) {
        logger.error({ err, batchId: batch.id }, "Background import failed");
        await db
          .update(importBatchesTable)
          .set({ status: "error", errorMessage: String(err) })
          .where(eq(importBatchesTable.id, batch.id))
          .catch(() => {});
      }
    })();
    return;
  } catch (err) {
    req.log.error({ err }, "Import run failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/status/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
    const [batch] = await db
      .select()
      .from(importBatchesTable)
      .where(eq(importBatchesTable.id, id))
      .limit(1);
    if (!batch) return res.status(404).json({ error: "Batch not found" });
    return res.json(batch);
  } catch (err) {
    req.log.error({ err }, "Import status fetch failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/history", async (req, res) => {
  try {
    const batches = await db
      .select()
      .from(importBatchesTable)
      .orderBy(desc(importBatchesTable.importedAt))
      .limit(50);
    return res.json({ batches });
  } catch (err) {
    req.log.error({ err }, "Failed to get import history");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
