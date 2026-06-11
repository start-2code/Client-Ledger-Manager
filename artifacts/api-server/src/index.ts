import app from "./app";
import { logger } from "./lib/logger";
import { db, importBatchesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

/**
 * On startup, any batch that was still "running" or "pending" when the server
 * last died will never complete.  Mark them as "error" immediately so the
 * frontend doesn't poll forever.
 */
async function recoverStaleBatches() {
  try {
    const stale = await db
      .update(importBatchesTable)
      .set({
        status: "error",
        errorMessage: "Import did not complete — the server was restarted while it was running. Please re-import.",
      })
      .where(inArray(importBatchesTable.status, ["running", "pending"]))
      .returning({ id: importBatchesTable.id });
    if (stale.length > 0) {
      logger.warn({ batchIds: stale.map((b) => b.id) }, "Marked stale in-progress batches as error on startup");
    }
  } catch (err) {
    logger.error({ err }, "Failed to recover stale batches on startup");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Best-effort: don't block startup
  void recoverStaleBatches();
});
