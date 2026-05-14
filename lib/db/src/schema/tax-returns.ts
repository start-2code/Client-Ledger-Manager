import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const taxReturnsTable = pgTable("tax_returns", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").unique().references(() => clientsTable.id, { onDelete: "set null" }),
  clientCode: text("client_code"),
  clientName: text("client_name").notNull(),
  clientType: text("client_type"),
  taxReturnStatus: text("tax_return_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaxReturnSchema = createInsertSchema(taxReturnsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaxReturn = z.infer<typeof insertTaxReturnSchema>;
export type TaxReturn = typeof taxReturnsTable.$inferSelect;
