import { pgTable, serial, integer, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const importBatchesTable = pgTable("import_batches", {
  id: serial("id").primaryKey(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  importedBy: text("imported_by"),
  filename: text("filename"),
  status: text("status").notNull().default("success"),
  errorMessage: text("error_message"),
  totalClients: integer("total_clients"),
  clientsAdded: integer("clients_added"),
  clientsUpdated: integer("clients_updated"),
  clientsRemoved: integer("clients_removed"),
  saReturnsCount: integer("sa_returns_count"),
  ctReturnsCount: integer("ct_returns_count"),
  accountsPeriodsCount: integer("accounts_periods_count"),
  summary: jsonb("summary"),
});

export const insertImportBatchSchema = createInsertSchema(importBatchesTable).omit({ id: true, importedAt: true });
export type InsertImportBatch = z.infer<typeof insertImportBatchSchema>;
export type ImportBatch = typeof importBatchesTable.$inferSelect;
