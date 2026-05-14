import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const financialInfoTable = pgTable("financial_info", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique().references(() => clientsTable.id, { onDelete: "cascade" }),
  clientCode: text("client_code"),
  clientType: text("client_type"),
  turnover: numeric("turnover", { precision: 15, scale: 2 }),
  profitBeforeTax: numeric("profit_before_tax", { precision: 15, scale: 2 }),
  totalIncome: numeric("total_income", { precision: 15, scale: 2 }),
  totalSelfEmploymentIncome: numeric("total_self_employment_income", { precision: 15, scale: 2 }),
  totalProfitFromSelfEmployments: numeric("total_profit_from_self_employments", { precision: 15, scale: 2 }),
  avgEmployees: numeric("avg_employees", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFinancialInfoSchema = createInsertSchema(financialInfoTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinancialInfo = z.infer<typeof insertFinancialInfoSchema>;
export type FinancialInfo = typeof financialInfoTable.$inferSelect;
