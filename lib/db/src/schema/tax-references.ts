import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const taxReferencesTable = pgTable("tax_references", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique().references(() => clientsTable.id, { onDelete: "cascade" }),
  clientName: text("client_name"),
  utr: text("utr"),
  payeRef: text("paye_ref"),
  payeAccountsOfficeRef: text("paye_accounts_office_ref"),
  vatRegNo: text("vat_reg_no"),
  vatRegDate: text("vat_reg_date"),
  taxOffice: text("tax_office"),
  niNumber: text("ni_number"),
  companyRegNo: text("company_reg_no"),
  dateOfIncorporation: text("date_of_incorporation"),
  amlStatus: text("aml_status"),
  latestAccountsStatus: text("latest_accounts_status"),
  engagementStatus: text("engagement_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaxReferenceSchema = createInsertSchema(taxReferencesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaxReference = z.infer<typeof insertTaxReferenceSchema>;
export type TaxReference = typeof taxReferencesTable.$inferSelect;
