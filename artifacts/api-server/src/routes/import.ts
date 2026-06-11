import { Router } from "express";
import multer from "multer";
import { parseTaxCalcZip } from "../lib/taxcalc-parser.js";
import { previewImport, runImport } from "../lib/taxcalc-importer.js";
import { db } from "@workspace/db";
import { importBatchesTable } from "@workspace/db";
import { desc } from "drizzle-orm";

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
    const parseResult = parseTaxCalcZip(req.file.buffer);
    if (parseResult.errors.length > 0 && parseResult.clients.size === 0) {
      return res.status(400).json({ error: "Failed to parse file", details: parseResult.errors });
    }
    const result = await runImport(parseResult.clients, {
      importedBy: (req.body?.importedBy as string) ?? "admin",
      filename: req.file.originalname,
    });
    return res.json({
      success: true,
      ...result,
      parseErrors: parseResult.errors,
    });
  } catch (err) {
    req.log.error({ err }, "Import run failed");
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
