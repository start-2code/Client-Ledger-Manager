import { pgTable, text, serial, integer, numeric, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const accountsPeriodsTable = pgTable(
  "accounts_periods",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
    periodStart: text("period_start"),
    periodEnd: text("period_end"),
    accountsStatus: text("accounts_status"),
    periodLocked: boolean("period_locked"),
    accountingStandard: text("accounting_standard"),
    averageEmployees: numeric("average_employees", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.clientId, table.periodStart, table.periodEnd)],
);

export const insertAccountsPeriodSchema = createInsertSchema(accountsPeriodsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccountsPeriod = z.infer<typeof insertAccountsPeriodSchema>;
export type AccountsPeriod = typeof accountsPeriodsTable.$inferSelect;
