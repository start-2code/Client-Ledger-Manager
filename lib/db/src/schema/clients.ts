import { pgTable, text, serial, timestamp, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  // Address
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  town: text("town"),
  county: text("county"),
  country: text("country"),
  postcode: text("postcode"),
  contactNumber: text("contact_number"),
  email: text("email"),
  // Personal contact
  title: text("title"),
  forename: text("forename"),
  middleName: text("middle_name"),
  surname: text("surname"),
  friendlySalutation: text("friendly_salutation"),
  gender: text("gender"),
  maritalStatus: text("marital_status"),
  dateOfBirth: date("date_of_birth"),
  dateOfDeath: date("date_of_death"),
  nationality: text("nationality"),
  countryOfResidence: text("country_of_residence"),
  // Business info
  occupation: text("occupation"),
  businessName: text("business_name"),
  businessType: text("business_type"),
  usualYearEnd: text("usual_year_end"),
  anticipatedTurnover: text("anticipated_turnover"),
  industryType: text("industry_type"),
  enrolledForMtdVat: text("enrolled_for_mtd_vat"),
  // Company info
  dateOfCommencement: date("date_of_commencement"),
  dateOfCessation: date("date_of_cessation"),
  companyType: text("company_type"),
  limitedLiabilityPartnership: boolean("limited_liability_partnership").default(false),
  countryOfIncorporation: text("country_of_incorporation"),
  dateOfIncorporation: date("date_of_incorporation"),
  tradingStatus: text("trading_status"),
  companyAuthenticationCode: text("company_authentication_code"),
  website: text("website"),
  isPropertyBusiness: boolean("is_property_business").default(false),
  confirmationStatementDate: date("confirmation_statement_date"),
  // Practice info
  assignedOffice: text("assigned_office"),
  bookkeepingSoftware: text("bookkeeping_software"),
  clientCreationDate: date("client_creation_date"),
  archived: boolean("archived").default(false),
  amlStatus: text("aml_status"),
  paymentMethod: text("payment_method"),
  // Engagement & consent
  engagementStatus: text("engagement_status"),
  consentType: text("consent_type"),
  consentStatus: text("consent_status"),
  methodOfConsent: text("method_of_consent"),
  dateOfConsent: date("date_of_consent"),
  dateOfLatestEngagement: date("date_of_latest_engagement"),
  dateOfClientLoss: date("date_of_client_loss"),
  // Google Drive
  driveFolderId: text("drive_folder_id"),
  // Practice flags
  smartvaultFlag: text("smartvault_flag"),
  engagerFlag: text("engager_flag"),
  portfolioFlag: text("portfolio_flag"),
  status64_8: text("status_64_8"),
  date64_8Completion: date("date_64_8_completion"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
