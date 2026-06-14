import { pgTable, text, serial, integer, numeric, timestamp, boolean, unique, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

const money = (name: string) => numeric(name, { precision: 15, scale: 2 });

export const saReturnsTable = pgTable(
  "sa_returns",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
    clientCode: text("client_code"),
    taxYear: text("tax_year").notNull(),
    returnType: text("return_type").notNull().default("personal"),
    // Status
    returnStatus: text("return_status"),
    returnFiledSuccessfully: boolean("return_filed_successfully"),
    returnLocked: boolean("return_locked"),
    dateFiledToHmrc: date("date_filed_to_hmrc"),
    dateLastSaved: date("date_last_saved"),
    dateLastStatusChange: date("date_last_status_change"),
    provisionalFields: boolean("provisional_fields"),
    // Income flags
    hasEmployment: boolean("has_employment"),
    hasSelfEmployment: boolean("has_self_employment"),
    hasPartnership: boolean("has_partnership"),
    hasUkProperty: boolean("has_uk_property"),
    hasForeignPages: boolean("has_foreign_pages"),
    hasCapitalGains: boolean("has_capital_gains"),
    hasResidenceAndRemittance: boolean("has_residence_and_remittance"),
    notResident: boolean("not_resident"),
    hasTrusts: boolean("has_trusts"),
    hasLloyds: boolean("has_lloyds"),
    // Income amounts
    totalEmploymentIncome: money("total_employment_income"),
    totalSelfEmploymentIncome: money("total_self_employment_income"),
    totalProfitFromSelfEmployments: money("total_profit_from_self_employments"),
    totalLossesFromSelfEmployments: money("total_losses_from_self_employments"),
    partnershipProfitLoss: money("partnership_profit_loss"),
    totalProfitFromPartnerships: money("total_profit_from_partnerships"),
    totalLossesFromPartnerships: money("total_losses_from_partnerships"),
    totalUkPropertyIncome: money("total_uk_property_income"),
    totalUkPropertyProfit: money("total_uk_property_profit"),
    furnishedHolidayLettings: boolean("furnished_holiday_lettings"),
    furnishedHolidayLettingsIncome: money("furnished_holiday_lettings_income"),
    furnishedHolidayLettingsProfits: money("furnished_holiday_lettings_profits"),
    rentARoom: boolean("rent_a_room"),
    totalForeignIncome: money("total_foreign_income"),
    totalForeignPropertyIncome: money("total_foreign_property_income"),
    totalTrustIncome: money("total_trust_income"),
    totalCapitalGains: money("total_capital_gains"),
    totalSavingsIncome: money("total_savings_income"),
    statePensionsTotal: money("state_pensions_total"),
    privatePensions: money("private_pensions"),
    adjustedTotalIncome: money("adjusted_total_income"),
    totalGrossBusinessIncome: money("total_gross_business_income"),
    totalProfitFromBusinesses: money("total_profit_from_businesses"),
    totalLossesFromBusinesses: money("total_losses_from_businesses"),
    ukLifePolicies: money("uk_life_policies"),
    ukVoidedIsas: money("uk_voided_isas"),
    foreignLifePolicies: money("foreign_life_policies"),
    // Tax
    totalTaxDue: money("total_tax_due"),
    class2NicDue: boolean("class_2_nic_due"),
    hasRepayment: boolean("has_repayment"),
    repaymentAmount: money("repayment_amount"),
    giftAidPayments: money("gift_aid_payments"),
    hasPaymentsOnAccount: boolean("has_payments_on_account"),
    poaThisYearJan: money("poa_this_year_jan"),
    poaThisYearJul: money("poa_this_year_jul"),
    poaNextYearJan: money("poa_next_year_jan"),
    poaNextYearJul: money("poa_next_year_jul"),
    childBenefit: money("child_benefit"),
    // Trust/partnership specific
    income: boolean("income"),
    netProfit: boolean("net_profit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.clientId, table.taxYear, table.returnType)],
);

export const insertSaReturnSchema = createInsertSchema(saReturnsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSaReturn = z.infer<typeof insertSaReturnSchema>;
export type SaReturn = typeof saReturnsTable.$inferSelect;
