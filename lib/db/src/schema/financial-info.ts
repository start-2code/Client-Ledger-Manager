import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

const money = (name: string) => numeric(name, { precision: 15, scale: 2 });

export const financialInfoTable = pgTable("financial_info", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique().references(() => clientsTable.id, { onDelete: "cascade" }),
  clientCode: text("client_code"),
  clientType: text("client_type"),
  // Legacy / P&L summary
  turnover: money("turnover"),
  profitBeforeTax: money("profit_before_tax"),
  totalIncome: money("total_income"),
  totalSelfEmploymentIncome: money("total_self_employment_income"),
  totalProfitFromSelfEmployments: money("total_profit_from_self_employments"),
  avgEmployees: numeric("avg_employees", { precision: 10, scale: 2 }),
  // P&L additions
  grossProfit: money("gross_profit"),
  operatingProfit: money("operating_profit"),
  otherIncome: money("other_income"),
  financeCosts: money("finance_costs"),
  profitForYear: money("profit_for_year"),
  dividends: money("dividends"),
  otherInterestReceivable: money("other_interest_receivable"),
  interestPayable: money("interest_payable"),
  // Balance sheet — assets
  intangibleAssets: money("intangible_assets"),
  tangibleAssets: money("tangible_assets"),
  investmentProperties: money("investment_properties"),
  fixedAssetInvestments: money("fixed_asset_investments"),
  fixedAssets: money("fixed_assets"),
  stock: money("stock"),
  debtors: money("debtors"),
  debtorsWithinOneYear: money("debtors_within_one_year"),
  directorsLoanOverdrawnWithin: money("directors_loan_overdrawn_within"),
  directorsLoanOverdrawnAfter: money("directors_loan_overdrawn_after"),
  cashAtBank: money("cash_at_bank"),
  bankBalances: money("bank_balances"),
  currentAssets: money("current_assets"),
  // Balance sheet — liabilities
  creditorsWithinOneYear: money("creditors_within_one_year"),
  directorsLoanAccount: money("directors_loan_account"),
  bankLoans: money("bank_loans"),
  netCurrentAssets: money("net_current_assets"),
  totalAssetsLessCurrentLiabilities: money("total_assets_less_current_liabilities"),
  creditorsAfterOneYear: money("creditors_after_one_year"),
  provisions: money("provisions"),
  netAssets: money("net_assets"),
  profitAndLossAccount: money("profit_and_loss_account"),
  shareholdersFunds: money("shareholders_funds"),
  capitalAccount: money("capital_account"),
  totalMembersInterest: money("total_members_interest"),
  netAssetsAttributableToMembers: money("net_assets_attributable_to_members"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFinancialInfoSchema = createInsertSchema(financialInfoTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinancialInfo = z.infer<typeof insertFinancialInfoSchema>;
export type FinancialInfo = typeof financialInfoTable.$inferSelect;
