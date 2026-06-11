import { pgTable, serial, integer, numeric, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

const money = (name: string) => numeric(name, { precision: 15, scale: 2 });

export const clientFeesTable = pgTable("client_fees", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique().references(() => clientsTable.id, { onDelete: "cascade" }),
  // Annual accounts
  annualAccountsFlag: boolean("annual_accounts_flag"),
  annualAccountsFee: money("annual_accounts_fee"),
  // Tax return
  taxReturnFlag: boolean("tax_return_flag"),
  taxReturnFee: money("tax_return_fee"),
  // Audit
  auditFlag: boolean("audit_flag"),
  auditFee: money("audit_fee"),
  // Bookkeeping
  bookkeepingFlag: boolean("bookkeeping_flag"),
  bookkeepingFee: money("bookkeeping_fee"),
  // VAT returns
  vatReturnsFlag: boolean("vat_returns_flag"),
  vatReturnsFee: money("vat_returns_fee"),
  // Payroll
  payrollFlag: boolean("payroll_flag"),
  payrollFee: money("payroll_fee"),
  // Consultancy
  consultancyFlag: boolean("consultancy_flag"),
  consultancyFee: money("consultancy_fee"),
  // Cashflow
  cashflowFlag: boolean("cashflow_flag"),
  cashflowFee: money("cashflow_fee"),
  // Management accounts
  managementAccountsFlag: boolean("management_accounts_flag"),
  managementAccountsFee: money("management_accounts_fee"),
  // Company secretarial
  companySecretarialFlag: boolean("company_secretarial_flag"),
  companySecretarialFee: money("company_secretarial_fee"),
  // Other
  otherFlag: boolean("other_flag"),
  otherFee: money("other_fee"),
  // Totals
  totalFee: money("total_fee"),
  // Records received
  recordsReceivedAnnual: text("records_received_annual"),
  recordsReceivedQ1: text("records_received_q1"),
  recordsReceivedQ1Revised: text("records_received_q1_revised"),
  recordsReceivedQ2: text("records_received_q2"),
  recordsReceivedQ3: text("records_received_q3"),
  recordsReceivedQ4: text("records_received_q4"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClientFeeSchema = createInsertSchema(clientFeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClientFee = z.infer<typeof insertClientFeeSchema>;
export type ClientFee = typeof clientFeesTable.$inferSelect;
