import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const taxReferencesTable = pgTable("tax_references", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique().references(() => clientsTable.id, { onDelete: "cascade" }),
  clientName: text("client_name"),
  // Tax identifiers
  utr: text("utr"),
  payeRef: text("paye_ref"),
  payeAccountsOfficeRef: text("paye_accounts_office_ref"),
  niNumber: text("ni_number"),
  companyRegNo: text("company_reg_no"),
  dateOfIncorporation: text("date_of_incorporation"),
  // Tax office
  taxOffice: text("tax_office"),
  taxOfficeTelephone: text("tax_office_telephone"),
  taxOfficeAddress1: text("tax_office_address_1"),
  taxOfficeAddress2: text("tax_office_address_2"),
  taxOfficeTown: text("tax_office_town"),
  taxOfficeCounty: text("tax_office_county"),
  taxOfficePostcode: text("tax_office_postcode"),
  // VAT
  vatRegNo: text("vat_reg_no"),
  vatRegDate: text("vat_reg_date"),
  vatDeRegistrationDate: text("vat_de_registration_date"),
  vatPeriodEnd: text("vat_period_end"),
  vatScheme: text("vat_scheme"),
  vatFlatRateScheme: text("vat_flat_rate_scheme"),
  ecSalesListPeriod: text("ec_sales_list_period"),
  // MTD
  enrolledForMtdIncomeTax: boolean("enrolled_for_mtd_income_tax").default(false),
  // AML & compliance
  amlStatus: text("aml_status"),
  amlLastCheckDate: text("aml_last_check_date"),
  p11dDispensation: text("p11d_dispensation"),
  pensionAutoEnrolmentDate: text("pension_auto_enrolment_date"),
  constructionIndustryScheme: boolean("construction_industry_scheme").default(false),
  individualIsPscNotDirector: boolean("individual_is_psc_not_director").default(false),
  individualIsPscAndDirector: boolean("individual_is_psc_and_director").default(false),
  vs01SubmissionDeadline: text("vs01_submission_deadline"),
  // Status fields (retained from original)
  latestAccountsStatus: text("latest_accounts_status"),
  latestCt600Status: text("latest_ct600_status"),
  engagementStatus: text("engagement_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaxReferenceSchema = createInsertSchema(taxReferencesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTaxReference = z.infer<typeof insertTaxReferenceSchema>;
export type TaxReference = typeof taxReferencesTable.$inferSelect;
