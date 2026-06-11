import { pgTable, serial, integer, timestamp, boolean, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

const money = (name: string) => numeric(name, { precision: 15, scale: 2 });

export const mtdItsaTable = pgTable("mtd_itsa", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique().references(() => clientsTable.id, { onDelete: "cascade" }),
  // MTD 26 submission info
  dateOfLastSubmission26: text("date_of_last_submission_26"),
  periodEndOfLastSubmission26: text("period_end_of_last_submission_26"),
  lastSubmissionSuccessful26: boolean("last_submission_successful_26"),
  // Qualifying income (annualised)
  qualifyingIncomeSelfEmployment: money("qualifying_income_self_employment"),
  qualifyingIncomeUkProperty: money("qualifying_income_uk_property"),
  qualifyingIncomeForeignProperty: money("qualifying_income_foreign_property"),
  totalQualifyingIncome: money("total_qualifying_income"),
  annualisedIncomeSelfEmployment: money("annualised_income_self_employment"),
  // MTD 26 qualifying income
  qualifyingIncomeSe26: money("qualifying_income_se_26"),
  qualifyingIncomeUkProp26: money("qualifying_income_uk_prop_26"),
  qualifyingIncomeForeignProp26: money("qualifying_income_foreign_prop_26"),
  totalQualifyingIncome26: money("total_qualifying_income_26"),
  // Exemption periods
  seAccountingPeriodNotAligned: boolean("se_accounting_period_not_aligned"),
  pshipBasisPeriodNotAligned: boolean("pship_basis_period_not_aligned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMtdItsaSchema = createInsertSchema(mtdItsaTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMtdItsa = z.infer<typeof insertMtdItsaSchema>;
export type MtdItsa = typeof mtdItsaTable.$inferSelect;
