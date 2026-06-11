import app from "./app";
import { logger } from "./lib/logger";
import { db, importBatchesTable, dropdownOptionsTable, saReturnsTable } from "@workspace/db";
import { inArray, sql } from "drizzle-orm";

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

/**
 * Ensure the canonical sa_return_status dropdown options exist.
 * Safe to run on every startup — uses ON CONFLICT DO NOTHING.
 */
async function seedSaReturnStatusOptions() {
  try {
    const options = [
      { category: "sa_return_status", value: "Not Set",                 sortOrder: 0 },
      { category: "sa_return_status", value: "In Progress",             sortOrder: 1 },
      { category: "sa_return_status", value: "Information Requested",   sortOrder: 2 },
      { category: "sa_return_status", value: "Sent to Client",          sortOrder: 3 },
      { category: "sa_return_status", value: "Filed Online to HMRC",    sortOrder: 4 },
      { category: "sa_return_status", value: "Filed Amendment to HMRC", sortOrder: 5 },
      { category: "sa_return_status", value: "Filed by Paper to HMRC",  sortOrder: 6 },
    ];
    await db.insert(dropdownOptionsTable).values(options).onConflictDoNothing();
    logger.info("Ensured sa_return_status dropdown options exist");
  } catch (err) {
    logger.error({ err }, "Failed to seed sa_return_status dropdown options");
  }
}

/**
 * Normalise camelCase return_status values (from older Excel exports) to
 * their human-readable equivalents so they match the dropdown options.
 */
async function normaliseSaReturnStatuses() {
  const mapping: Record<string, string> = {
    notSet:               "Not Set",
    inProgress:           "In Progress",
    filedOnlineToHMRC:    "Filed Online to HMRC",
    filedAmendmentToHMRC: "Filed Amendment to HMRC",
    filedPaperToHmrc:     "Filed by Paper to HMRC",
    sentToClient:         "Sent to Client",
  };
  try {
    for (const [from, to] of Object.entries(mapping)) {
      await db
        .update(saReturnsTable)
        .set({ returnStatus: to })
        .where(sql`${saReturnsTable.returnStatus} = ${from}`);
    }
    logger.info("Normalised camelCase sa_return_status values");
  } catch (err) {
    logger.error({ err }, "Failed to normalise sa_return_status values");
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
  void seedSaReturnStatusOptions();
  void normaliseSaReturnStatuses();
});
