import { pgTable, text, serial, integer, numeric, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

const money = (name: string) => numeric(name, { precision: 15, scale: 2 });

export const ctReturnsTable = pgTable(
  "ct_returns",
  {
    id: serial("id").primaryKey(),
    clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "cascade" }),
    // Period
    ctPeriodStart: text("ct_period_start"),
    ctPeriodEnd: text("ct_period_end"),
    ctPaymentDeadline: text("ct_payment_deadline"),
    // Computation — income
    companyTurnover: money("company_turnover"),
    tradingProfits: money("trading_profits"),
    bfwdTradeLossPreApr2017: money("bfwd_trade_loss_pre_apr_2017"),
    netTradingProfits: money("net_trading_profits"),
    incomeFromProperty: money("income_from_property"),
    lossesBfwdAgainstInvestmentIncome: money("losses_bfwd_against_investment_income"),
    ukPropertyLosses: money("uk_property_losses"),
    tradingLossesUsed: money("trading_losses_used"),
    lossesCarriedBack: boolean("losses_carried_back"),
    tradingLossesBfwdUsed: money("trading_losses_bfwd_used"),
    totalDeductionsAndReliefs: money("total_deductions_and_reliefs"),
    // Chargeable
    profitsChargeableToCt: money("profits_chargeable_to_ct"),
    noAssociatedCompanies: integer("no_associated_companies"),
    noAssociatedCompaniesFy1: integer("no_associated_companies_fy1"),
    noAssociatedCompaniesFy2: integer("no_associated_companies_fy2"),
    smallProfitRateOrMarginalRelief: boolean("small_profit_rate_or_marginal_relief"),
    corporationTax: money("corporation_tax"),
    marginalRelief: money("marginal_relief"),
    ctChargeable: money("ct_chargeable"),
    netCtLiability: money("net_ct_liability"),
    s455TaxPayable: money("s455_tax_payable"),
    incomeTaxDeducted: money("income_tax_deducted"),
    incomeTaxRepayableToCompany: money("income_tax_repayable_to_company"),
    selfAssessmentTaxPayable: money("self_assessment_tax_payable"),
    // Credits
    rdCredit: money("rd_credit"),
    creativeTaxCredit: money("creative_tax_credit"),
    capitalAllowancesCredit: money("capital_allowances_credit"),
    surplusCreditsPayable: money("surplus_credits_payable"),
    corporationTaxOutstanding: money("corporation_tax_outstanding"),
    corporationTaxOverpaid: money("corporation_tax_overpaid"),
    rdecSurrenderedToCompany: money("rdec_surrendered_to_company"),
    taxAlreadyPaid: money("tax_already_paid"),
    liableToLargeCompanyInstalments: boolean("liable_to_large_company_instalments"),
    liableToVeryLargeCompanyInstalments: boolean("liable_to_very_large_company_instalments"),
    withinGroupPaymentsArrangement: boolean("within_group_payments_arrangement"),
    // R&D
    rdClaimBySme: boolean("rd_claim_by_sme"),
    rdClaimByLargeCompany: boolean("rd_claim_by_large_company"),
    rdNotificationFormSubmitted: boolean("rd_notification_form_submitted"),
    additionalInformationFormSubmitted: boolean("additional_information_form_submitted"),
    smeRdExpenditure: money("sme_rd_expenditure"),
    rdEnhancedExpenditure: money("rd_enhanced_expenditure"),
    creativeExpenditure: money("creative_expenditure"),
    rdAndCreativeEnhancedExpenditure: money("rd_and_creative_enhanced_expenditure"),
    rdEnhancedExpenditureIncSubcontracted: money("rd_enhanced_expenditure_inc_subcontracted"),
    // CT600 supplementary pages
    ct600a: boolean("ct600a"),
    ct600b: boolean("ct600b"),
    ct600c: boolean("ct600c"),
    ct600d: boolean("ct600d"),
    ct600e: boolean("ct600e"),
    ct600f: boolean("ct600f"),
    ct600g: boolean("ct600g"),
    ct600h: boolean("ct600h"),
    ct600j: boolean("ct600j"),
    ct600k: boolean("ct600k"),
    ct600l: boolean("ct600l"),
    ct600m: boolean("ct600m"),
    ct600n: boolean("ct600n"),
    // CT special fields
    typeOfCompanyCt600: boolean("type_of_company_ct600"),
    hasRepayment: boolean("has_repayment"),
    claimAffectingEarlierPeriod: boolean("claim_affecting_earlier_period"),
    northernIrelandTrading: boolean("northern_ireland_trading"),
    // Status
    returnFiledSuccessfully: boolean("return_filed_successfully"),
    returnLocked: boolean("return_locked"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.clientId, table.ctPeriodStart, table.ctPeriodEnd)],
);

export const insertCtReturnSchema = createInsertSchema(ctReturnsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCtReturn = z.infer<typeof insertCtReturnSchema>;
export type CtReturn = typeof ctReturnsTable.$inferSelect;
