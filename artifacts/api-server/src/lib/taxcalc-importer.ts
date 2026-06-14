import { db } from "@workspace/db";
import {
  clientsTable,
  taxReferencesTable,
  financialInfoTable,
  clientFeesTable,
  saReturnsTable,
  ctReturnsTable,
  accountsPeriodsTable,
  companiesHouseTable,
  mtdItsaTable,
} from "@workspace/db";
import { eq, inArray, getTableColumns, getTableName, sql } from "drizzle-orm";
import type { ClientRecord } from "./taxcalc-parser.js";

function b(v: string | null | undefined): boolean | null {
  if (v === null || v === undefined) return null;
  const s = v.trim().toLowerCase();
  if (s === "yes" || s === "true") return true;
  if (s === "no" || s === "false" || s === "notset") return false;
  return null;
}

function n(v: string | null | undefined): string | null {
  return v ?? null;
}

/**
 * Builds the SET clause for an ON CONFLICT DO UPDATE, referencing EXCLUDED.<col>
 * for every column not in `skipKeys`. This lets us bulk-upsert without repeating
 * the full values object.
 */
function makeExcludedSet(table: any, skipKeys: string[]): Record<string, any> {
  const tableName = getTableName(table);
  const cols = getTableColumns(table) as Record<string, { name: string }>;
  return Object.fromEntries(
    Object.entries(cols)
      .filter(([key]) => !skipKeys.includes(key))
      .map(([key, col]) => [
        key,
        // COALESCE preserves the existing value when the incoming value is NULL.
        // This makes partial imports safe: only fields present in the ZIP are updated;
        // fields from files not included in the ZIP are left untouched.
        sql.raw(`COALESCE(excluded.${col.name}, ${tableName}.${col.name})`),
      ]),
  );
}

async function bulkUpsert<T extends Record<string, any>>(
  table: any,
  rows: T[],
  conflictTarget: any,
  skipKeys: string[],
  chunkSize = 200,
): Promise<void> {
  if (rows.length === 0) return;
  const set = makeExcludedSet(table, skipKeys);
  for (let i = 0; i < rows.length; i += chunkSize) {
    await db
      .insert(table)
      .values(rows.slice(i, i + chunkSize))
      .onConflictDoUpdate({ target: conflictTarget, set });
  }
}

export interface ImportResult {
  clientsAdded: number;
  clientsUpdated: number;
  saReturnsCount: number;
  ctReturnsCount: number;
  accountsPeriodsCount: number;
  errors: string[];
}

export interface PreviewResult {
  totalClients: number;
  clientsToAdd: number;
  clientsToUpdate: number;
  clientsToRemove: number;
  saReturnsCount: number;
  ctReturnsCount: number;
  accountsPeriodsCount: number;
}

export async function previewImport(clients: Map<string, ClientRecord>): Promise<PreviewResult> {
  const incomingCodes = [...clients.keys()];
  const existing = await db.select({ code: clientsTable.code }).from(clientsTable);
  const existingCodes = new Set(existing.map((e) => e.code));
  const incomingSet = new Set(incomingCodes);

  const clientsToAdd = incomingCodes.filter((c) => !existingCodes.has(c)).length;
  const clientsToUpdate = incomingCodes.filter((c) => existingCodes.has(c)).length;
  const clientsToRemove = existing.filter((e) => !incomingSet.has(e.code)).length;

  let saCount = 0;
  let ctCount = 0;
  let apCount = 0;
  for (const cr of clients.values()) {
    saCount += cr.saReturns.size;
    if (Object.keys(cr.ctReturn).length > 0) ctCount++;
    if (Object.keys(cr.accountsPeriod).length > 0) apCount++;
  }

  return {
    totalClients: incomingCodes.length,
    clientsToAdd,
    clientsToUpdate,
    clientsToRemove,
    saReturnsCount: saCount,
    ctReturnsCount: ctCount,
    accountsPeriodsCount: apCount,
  };
}

export async function runImport(
  clients: Map<string, ClientRecord>,
  options: { importedBy?: string; filename?: string } = {},
): Promise<ImportResult> {
  const errors: string[] = [];

  // ─── Phase 0: count existing codes for metrics ────────────────────────────
  const existing = await db
    .select({ id: clientsTable.id, code: clientsTable.code })
    .from(clientsTable);
  const existingMap = new Map(existing.map((e) => [e.code, e.id]));
  const existingCodes = new Set(existingMap.keys());

  const clientsAdded = [...clients.keys()].filter((c) => !existingCodes.has(c)).length;
  const clientsUpdated = [...clients.keys()].filter((c) => existingCodes.has(c)).length;

  // ─── Phase 1: bulk-upsert all clients, collect returned IDs ───────────────
  const clientRows = [...clients.entries()].map(([code, cr]) => ({
    code,
    name: cr.name ?? code,
    type: cr.type ?? "Unknown",
    addressLine1: n(cr.addressLine1),
    addressLine2: n(cr.addressLine2),
    town: n(cr.town),
    county: n(cr.county),
    country: n(cr.country),
    postcode: n(cr.postcode),
    contactNumber: n(cr.contactNumber),
    email: n(cr.email),
    title: n(cr.title),
    forename: n(cr.forename),
    middleName: n(cr.middleName),
    surname: n(cr.surname),
    friendlySalutation: n(cr.friendlySalutation),
    gender: n(cr.gender),
    maritalStatus: n(cr.maritalStatus),
    dateOfBirth: n(cr.dateOfBirth),
    dateOfDeath: n(cr.dateOfDeath),
    nationality: n(cr.nationality),
    countryOfResidence: n(cr.countryOfResidence),
    occupation: n(cr.occupation),
    businessName: n(cr.businessName),
    businessType: n(cr.businessType),
    usualYearEnd: n(cr.usualYearEnd),
    anticipatedTurnover: n(cr.anticipatedTurnover),
    industryType: n(cr.industryType),
    enrolledForMtdVat: n(cr.enrolledForMtdVat),
    dateOfCommencement: n(cr.dateOfCommencement),
    dateOfCessation: n(cr.dateOfCessation),
    limitedLiabilityPartnership: b(cr.limitedLiabilityPartnership),
    companyType: n(cr.companyType),
    countryOfIncorporation: n(cr.countryOfIncorporation),
    dateOfIncorporation: n(cr.dateOfIncorporation),
    tradingStatus: n(cr.tradingStatus),
    isPropertyBusiness: b(cr.isPropertyBusiness),
    companyAuthenticationCode: n(cr.companyAuthenticationCode),
    confirmationStatementDate: n(cr.confirmationStatementDate),
    assignedOffice: n(cr.assignedOffice),
    bookkeepingSoftware: n(cr.bookkeepingSoftware),
    paymentMethod: n(cr.paymentMethod),
    clientCreationDate: n(cr.clientCreationDate),
    archived: b(cr.archived),
    amlStatus: n(cr.amlStatus),
    website: n(cr.website),
    engagementStatus: n(cr.engagementStatus),
    consentType: n(cr.consentType),
    consentStatus: n(cr.consentStatus),
    methodOfConsent: n(cr.methodOfConsent),
    dateOfConsent: n(cr.dateOfConsent),
    dateOfLatestEngagement: n(cr.dateOfLatestEngagement),
    dateOfClientLoss: n(cr.dateOfClientLoss),
    smartvaultFlag: n(cr.smartvaultFlag),
    engagerFlag: n(cr.engagerFlag),
    portfolioFlag: n(cr.portfolioFlag),
    status64_8: n(cr.status64_8),
    date64_8Completion: n(cr.date64_8Completion),
  }));

  const clientIdMap = new Map<string, number>();
  const clientExcludedSet = {
    ...makeExcludedSet(clientsTable, ["id", "code"]),
    // "Unknown" is a sentinel written when DB#11 is absent from the ZIP.
    // Treat it the same as null so COALESCE preserves the real existing type.
    type: sql.raw(`COALESCE(NULLIF(excluded.type, 'Unknown'), clients.type)`),
  };
  for (let i = 0; i < clientRows.length; i += 200) {
    try {
      const returned = await db
        .insert(clientsTable)
        .values(clientRows.slice(i, i + 200))
        .onConflictDoUpdate({ target: clientsTable.code, set: clientExcludedSet })
        .returning({ id: clientsTable.id, code: clientsTable.code });
      for (const r of returned) clientIdMap.set(r.code, r.id);
    } catch (e: any) {
      errors.push(`Clients chunk ${i}: ${e.message}`);
    }
  }

  // ─── Phase 2: build all child-table rows ──────────────────────────────────
  const taxRefRows: any[] = [];
  const fiRows: any[] = [];
  const feesRows: any[] = [];
  const ctRows: any[] = [];
  const apRows: any[] = [];
  const chRows: any[] = [];
  const mtdRows: any[] = [];
  const saRows: any[] = [];

  for (const [code, cr] of clients) {
    const clientId = clientIdMap.get(code) ?? existingMap.get(code);
    if (!clientId) continue;

    // Tax references
    const tr = cr.taxRef;
    taxRefRows.push({
      clientId,
      clientName: cr.name ?? code,
      utr: n(tr.utr),
      payeRef: n(tr.payeRef),
      payeAccountsOfficeRef: n(tr.payeAccountsOfficeRef),
      vatRegNo: n(tr.vatRegNo),
      vatRegDate: n(tr.vatRegDate),
      vatDeRegistrationDate: n(tr.vatDeRegistrationDate),
      vatPeriodEnd: n(tr.vatPeriodEnd),
      vatScheme: n(tr.vatScheme),
      vatFlatRateScheme: n(tr.vatFlatRateScheme),
      ecSalesListPeriod: n(tr.ecSalesListPeriod),
      niNumber: n(tr.niNumber),
      companyRegNo: n(tr.companyRegNo),
      taxOffice: n(tr.taxOffice),
      taxOfficeTelephone: n(tr.taxOfficeTelephone),
      taxOfficeAddress1: n(tr.taxOfficeAddress1),
      taxOfficeAddress2: n(tr.taxOfficeAddress2),
      taxOfficeTown: n(tr.taxOfficeTown),
      taxOfficeCounty: n(tr.taxOfficeCounty),
      taxOfficePostcode: n(tr.taxOfficePostcode),
      enrolledForMtdIncomeTax: b(tr.enrolledForMtdIncomeTax),
      amlLastCheckDate: n(tr.amlLastCheckDate),
      amlStatus: n(cr.amlStatus),
      p11dDispensation: n(tr.p11dDispensation),
      pensionAutoEnrolmentDate: n(tr.pensionAutoEnrolmentDate),
      constructionIndustryScheme: b(tr.constructionIndustryScheme),
      individualIsPscNotDirector: b(tr.individualIsPscNotDirector),
      individualIsPscAndDirector: b(tr.individualIsPscAndDirector),
      vs01SubmissionDeadline: n(tr.vs01SubmissionDeadline),
      latestAccountsStatus: n(tr.latestAccountsStatus),
      latestCt600Status: n(tr.latestCt600Status),
      engagementStatus: n(cr.engagementStatus),
    });

    // Financial info
    const f = cr.financial;
    fiRows.push({
      clientId,
      clientCode: code,
      clientType: cr.type,
      turnover: n(f["turnover"]),
      profitBeforeTax: n(f["profitBeforeTax"]),
      grossProfit: n(f["grossProfit"]),
      operatingProfit: n(f["operatingProfit"]),
      otherIncome: n(f["otherIncome"]),
      otherInterestReceivable: n(f["otherInterestReceivable"]),
      interestPayable: n(f["interestPayable"]),
      profitForYear: n(f["profitForYear"]),
      dividends: n(f["dividends"]),
      totalIncome: n(f["totalIncome"]),
      totalSelfEmploymentIncome: n(f["totalSelfEmploymentIncome"]),
      totalProfitFromSelfEmployments: n(f["totalProfitFromSelfEmployments"]),
      intangibleAssets: n(f["intangibleAssets"]),
      tangibleAssets: n(f["tangibleAssets"]),
      investmentProperties: n(f["investmentProperties"]),
      fixedAssetInvestments: n(f["fixedAssetInvestments"]),
      fixedAssets: n(f["fixedAssets"]),
      stock: n(f["stock"]),
      debtors: n(f["debtors"]),
      debtorsWithinOneYear: n(f["debtorsWithinOneYear"]),
      directorsLoanOverdrawnWithin: n(f["directorsLoanOverdrawnWithin"]),
      directorsLoanOverdrawnAfter: n(f["directorsLoanOverdrawnAfter"]),
      cashAtBank: n(f["cashAtBank"]),
      bankBalances: n(f["bankBalances"]),
      currentAssets: n(f["currentAssets"]),
      creditorsWithinOneYear: n(f["creditorsWithinOneYear"]),
      directorsLoanAccount: n(f["directorsLoanAccount"]),
      bankLoans: n(f["bankLoans"]),
      netCurrentAssets: n(f["netCurrentAssets"]),
      netAssets: n(f["netAssets"]),
      totalAssetsLessCurrentLiabilities: n(f["totalAssetsLessCurrentLiabilities"]),
      creditorsAfterOneYear: n(f["creditorsAfterOneYear"]),
      provisions: n(f["provisions"]),
      profitAndLossAccount: n(f["profitAndLossAccount"]),
      shareholdersFunds: n(f["shareholdersFunds"]),
      capitalAccount: n(f["capitalAccount"]),
      totalMembersInterest: n(f["totalMembersInterest"]),
      netAssetsAttributableToMembers: n(f["netAssetsAttributableToMembers"]),
    });

    // Client fees
    const fees = cr.fees;
    feesRows.push({
      clientId,
      annualAccountsFlag: b(fees["annualAccountsFlag"]),
      annualAccountsFee: n(fees["annualAccountsFee"]),
      taxReturnFlag: b(fees["taxReturnFlag"]),
      taxReturnFee: n(fees["taxReturnFee"]),
      auditFlag: b(fees["auditFlag"]),
      auditFee: n(fees["auditFee"]),
      bookkeepingFlag: b(fees["bookkeepingFlag"]),
      bookkeepingFee: n(fees["bookkeepingFee"]),
      vatReturnsFlag: b(fees["vatReturnsFlag"]),
      vatReturnsFee: n(fees["vatReturnsFee"]),
      payrollFlag: b(fees["payrollFlag"]),
      payrollFee: n(fees["payrollFee"]),
      consultancyFlag: b(fees["consultancyFlag"]),
      consultancyFee: n(fees["consultancyFee"]),
      cashflowFlag: b(fees["cashflowFlag"]),
      cashflowFee: n(fees["cashflowFee"]),
      managementAccountsFlag: b(fees["managementAccountsFlag"]),
      managementAccountsFee: n(fees["managementAccountsFee"]),
      companySecretarialFlag: b(fees["companySecretarialFlag"]),
      companySecretarialFee: n(fees["companySecretarialFee"]),
      otherFlag: b(fees["otherFlag"]),
      otherFee: n(fees["otherFee"]),
      totalFee: n(fees["totalFee"]),
      recordsReceivedAnnual: n(fees["recordsReceivedAnnual"]),
      recordsReceivedQ1: n(fees["recordsReceivedQ1"]),
      recordsReceivedQ1Revised: n(fees["recordsReceivedQ1Revised"]),
      recordsReceivedQ2: n(fees["recordsReceivedQ2"]),
      recordsReceivedQ3: n(fees["recordsReceivedQ3"]),
      recordsReceivedQ4: n(fees["recordsReceivedQ4"]),
    });

    // CT return
    const ct = cr.ctReturn;
    if (Object.keys(ct).length > 0) {
      ctRows.push({
        clientId,
        ctPeriodStart: n(ct["ctPeriodStart"] as string),
        ctPeriodEnd: n(ct["ctPeriodEnd"] as string),
        ctPaymentDeadline: n(ct["ctPaymentDeadline"] as string),
        companyTurnover: n(ct["companyTurnover"] as string),
        tradingProfits: n(ct["tradingProfits"] as string),
        bfwdTradeLossPreApr2017: n(ct["bfwdTradeLossPreApr2017"] as string),
        netTradingProfits: n(ct["netTradingProfits"] as string),
        incomeFromProperty: n(ct["incomeFromProperty"] as string),
        lossesBfwdAgainstInvestmentIncome: n(ct["lossesBfwdAgainstInvestmentIncome"] as string),
        ukPropertyLosses: n(ct["ukPropertyLosses"] as string),
        tradingLossesUsed: n(ct["tradingLossesUsed"] as string),
        lossesCarriedBack: (ct["lossesCarriedBack"] as boolean) ?? null,
        tradingLossesBfwdUsed: n(ct["tradingLossesBfwdUsed"] as string),
        totalDeductionsAndReliefs: n(ct["totalDeductionsAndReliefs"] as string),
        profitsChargeableToCt: n(ct["profitsChargeableToCt"] as string),
        noAssociatedCompanies:
          ct["noAssociatedCompanies"] != null ? Number(ct["noAssociatedCompanies"]) || null : null,
        noAssociatedCompaniesFy1:
          ct["noAssociatedCompaniesFy1"] != null
            ? Number(ct["noAssociatedCompaniesFy1"]) || null
            : null,
        noAssociatedCompaniesFy2:
          ct["noAssociatedCompaniesFy2"] != null
            ? Number(ct["noAssociatedCompaniesFy2"]) || null
            : null,
        smallProfitRateOrMarginalRelief:
          (ct["smallProfitRateOrMarginalRelief"] as boolean) ?? null,
        corporationTax: n(ct["corporationTax"] as string),
        marginalRelief: n(ct["marginalRelief"] as string),
        ctChargeable: n(ct["ctChargeable"] as string),
        netCtLiability: n(ct["netCtLiability"] as string),
        s455TaxPayable: n(ct["s455TaxPayable"] as string),
        incomeTaxDeducted: n(ct["incomeTaxDeducted"] as string),
        incomeTaxRepayableToCompany: n(ct["incomeTaxRepayableToCompany"] as string),
        selfAssessmentTaxPayable: n(ct["selfAssessmentTaxPayable"] as string),
        rdCredit: n(ct["rdCredit"] as string),
        creativeTaxCredit: n(ct["creativeTaxCredit"] as string),
        capitalAllowancesCredit: n(ct["capitalAllowancesCredit"] as string),
        surplusCreditsPayable: n(ct["surplusCreditsPayable"] as string),
        taxAlreadyPaid: n(ct["taxAlreadyPaid"] as string),
        corporationTaxOutstanding: n(ct["corporationTaxOutstanding"] as string),
        corporationTaxOverpaid: n(ct["corporationTaxOverpaid"] as string),
        rdecSurrenderedToCompany: n(ct["rdecSurrenderedToCompany"] as string),
        liableToLargeCompanyInstalments:
          (ct["liableToLargeCompanyInstalments"] as boolean) ?? null,
        liableToVeryLargeCompanyInstalments:
          (ct["liableToVeryLargeCompanyInstalments"] as boolean) ?? null,
        withinGroupPaymentsArrangement:
          (ct["withinGroupPaymentsArrangement"] as boolean) ?? null,
        rdClaimBySme: (ct["rdClaimBySme"] as boolean) ?? null,
        rdClaimByLargeCompany: (ct["rdClaimByLargeCompany"] as boolean) ?? null,
        rdNotificationFormSubmitted: (ct["rdNotificationFormSubmitted"] as boolean) ?? null,
        additionalInformationFormSubmitted:
          (ct["additionalInformationFormSubmitted"] as boolean) ?? null,
        smeRdExpenditure: n(ct["smeRdExpenditure"] as string),
        rdEnhancedExpenditure: n(ct["rdEnhancedExpenditure"] as string),
        creativeExpenditure: n(ct["creativeExpenditure"] as string),
        rdAndCreativeEnhancedExpenditure: n(ct["rdAndCreativeEnhancedExpenditure"] as string),
        rdEnhancedExpenditureIncSubcontracted: n(
          ct["rdEnhancedExpenditureIncSubcontracted"] as string,
        ),
        ct600a: (ct["ct600a"] as boolean) ?? null,
        ct600b: (ct["ct600b"] as boolean) ?? null,
        ct600c: (ct["ct600c"] as boolean) ?? null,
        ct600d: (ct["ct600d"] as boolean) ?? null,
        ct600e: (ct["ct600e"] as boolean) ?? null,
        ct600f: (ct["ct600f"] as boolean) ?? null,
        ct600g: (ct["ct600g"] as boolean) ?? null,
        ct600h: (ct["ct600h"] as boolean) ?? null,
        ct600j: (ct["ct600j"] as boolean) ?? null,
        ct600k: (ct["ct600k"] as boolean) ?? null,
        ct600l: (ct["ct600l"] as boolean) ?? null,
        ct600m: (ct["ct600m"] as boolean) ?? null,
        ct600n: (ct["ct600n"] as boolean) ?? null,
        typeOfCompanyCt600: (ct["typeOfCompanyCt600"] as boolean) ?? null,
        hasRepayment: (ct["hasRepayment"] as boolean) ?? null,
        claimAffectingEarlierPeriod: (ct["claimAffectingEarlierPeriod"] as boolean) ?? null,
        northernIrelandTrading: (ct["northernIrelandTrading"] as boolean) ?? null,
        returnFiledSuccessfully: (ct["returnFiledSuccessfully"] as boolean) ?? null,
        returnLocked: (ct["returnLocked"] as boolean) ?? null,
      });
    }

    // Accounts period
    const ap = cr.accountsPeriod;
    if (Object.keys(ap).length > 0) {
      apRows.push({
        clientId,
        periodStart: n(ap["periodStart"]),
        periodEnd: n(ap["periodEnd"]),
        accountsStatus: n(ap["accountsStatus"]),
        periodLocked: b(ap["periodLocked"]),
        accountingStandard: n(ap["accountingStandard"]),
        averageEmployees: n(ap["averageEmployees"]),
      });
    }

    // Companies House
    const ch = cr.chForms;
    chRows.push({
      clientId,
      relationshipClientCode: n(ch["relationshipClientCode"]),
      mtd2026Q1: n(ch["mtd2026Q1"]),
      mtd2026Q2: n(ch["mtd2026Q2"]),
      mtd2026Q3: n(ch["mtd2026Q3"]),
      mtd2026Q4: n(ch["mtd2026Q4"]),
      mtd2027Q1: n(ch["mtd2027Q1"]),
      mtd2027Q2: n(ch["mtd2027Q2"]),
      mtd2027Q3: n(ch["mtd2027Q3"]),
      mtd2027Q4: n(ch["mtd2027Q4"]),
      cs01: n(ch["cs01"]),
      sh01: n(ch["sh01"]),
      ad01: n(ch["ad01"]),
      ad05: n(ch["ad05"]),
      ap01: b(ch["ap01"]),
      ap02: b(ch["ap02"]),
      ap03: b(ch["ap03"]),
      ap04: b(ch["ap04"]),
      ch01: b(ch["ch01"]),
      ch02: b(ch["ch02"]),
      ch03: b(ch["ch03"]),
      ch04: b(ch["ch04"]),
      tm01: b(ch["tm01"]),
      tm02: b(ch["tm02"]),
      aa01: b(ch["aa01"]),
      aa02: b(ch["aa02"]),
      aa03: b(ch["aa03"]),
      aa06: b(ch["aa06"]),
      ad03: b(ch["ad03"]),
      ad04: b(ch["ad04"]),
      nm01: b(ch["nm01"]),
      nm02: b(ch["nm02"]),
      nm03: b(ch["nm03"]),
      nm04: b(ch["nm04"]),
      psc01: b(ch["psc01"]),
      psc02: b(ch["psc02"]),
      psc04: b(ch["psc04"]),
      psc05: b(ch["psc05"]),
      psc07: b(ch["psc07"]),
      psc08: b(ch["psc08"]),
      psc09: b(ch["psc09"]),
      em01: n(ch["em01"]),
      vs01SubmissionDeadline: n(ch["vs01SubmissionDeadline"]),
    });

    // MTD ITSA
    const m = cr.mtdItsa;
    mtdRows.push({
      clientId,
      dateOfLastSubmission26: n(m["dateOfLastSubmission26"]),
      periodEndOfLastSubmission26: n(m["periodEndOfLastSubmission26"]),
      lastSubmissionSuccessful26: b(m["lastSubmissionSuccessful26"]),
      qualifyingIncomeSelfEmployment: null as string | null,
      qualifyingIncomeUkProperty: null as string | null,
      qualifyingIncomeForeignProperty: null as string | null,
      totalQualifyingIncome: null as string | null,
      annualisedIncomeSelfEmployment: n(m["annualisedIncomeSelfEmployment"]),
      qualifyingIncomeSe26: null as string | null,
      qualifyingIncomeUkProp26: null as string | null,
      qualifyingIncomeForeignProp26: null as string | null,
      totalQualifyingIncome26: null as string | null,
      seAccountingPeriodNotAligned: b(m["seAccountingPeriodNotAligned"]),
      pshipBasisPeriodNotAligned: b(m["pshipBasisPeriodNotAligned"]),
    });

    // SA returns — collect for bulk insert below
    for (const [key, sa] of cr.saReturns) {
      const [yearStr] = key.split("_");
      saRows.push({
        clientId,
        clientCode: code,
        taxYear: yearStr,
        returnType: sa.returnType,
        returnStatus: n(sa.returnStatus),
        returnFiledSuccessfully: sa.returnFiledSuccessfully ?? null,
        returnLocked: sa.returnLocked ?? null,
        dateFiledToHmrc: n(sa.dateFiledToHmrc),
        dateLastSaved: n(sa.dateLastSaved),
        dateLastStatusChange: n(sa.dateLastStatusChange),
        provisionalFields: sa.provisionalFields ?? null,
        income: sa.income ?? null,
        netProfit: sa.netProfit ?? null,
        hasRepayment: sa.hasRepayment ?? null,
        repaymentAmount: n(sa.repaymentAmount),
        hasEmployment: sa.hasEmployment ?? null,
        totalEmploymentIncome: n(sa.totalEmploymentIncome),
        hasSelfEmployment: sa.hasSelfEmployment ?? null,
        totalSelfEmploymentIncome: n(sa.totalSelfEmploymentIncome),
        totalProfitFromSelfEmployments: n(sa.totalProfitFromSelfEmployments),
        totalLossesFromSelfEmployments: n(sa.totalLossesFromSelfEmployments),
        hasLloyds: sa.hasLloyds ?? null,
        hasPartnership: sa.hasPartnership ?? null,
        partnershipProfitLoss: n(sa.partnershipProfitLoss),
        totalProfitFromPartnerships: n(sa.totalProfitFromPartnerships),
        totalLossesFromPartnerships: n(sa.totalLossesFromPartnerships),
        hasUkProperty: sa.hasUkProperty ?? null,
        totalUkPropertyProfit: n(sa.totalUkPropertyProfit),
        rentARoom: sa.rentARoom ?? null,
        totalUkPropertyIncome: n(sa.totalUkPropertyIncome),
        hasForeignPages: sa.hasForeignPages ?? null,
        totalForeignIncome: n(sa.totalForeignIncome),
        totalForeignPropertyIncome: n(sa.totalForeignPropertyIncome),
        hasTrusts: sa.hasTrusts ?? null,
        totalTrustIncome: n(sa.totalTrustIncome),
        hasCapitalGains: sa.hasCapitalGains ?? null,
        totalCapitalGains: n(sa.totalCapitalGains),
        hasResidenceAndRemittance: sa.hasResidenceAndRemittance ?? null,
        notResident: sa.notResident ?? null,
        furnishedHolidayLettings: sa.furnishedHolidayLettings ?? null,
        furnishedHolidayLettingsIncome: n(sa.furnishedHolidayLettingsIncome),
        furnishedHolidayLettingsProfits: n(sa.furnishedHolidayLettingsProfits),
        ukLifePolicies: n(sa.ukLifePolicies),
        ukVoidedIsas: n(sa.ukVoidedIsas),
        foreignLifePolicies: n(sa.foreignLifePolicies),
        adjustedTotalIncome: n(sa.adjustedTotalIncome),
        totalIncome: n(sa.totalIncome),
        totalProfitFromBusinesses: n(sa.totalProfitFromBusinesses),
        totalGrossBusinessIncome: n(sa.totalGrossBusinessIncome),
        totalLossesFromBusinesses: n(sa.totalLossesFromBusinesses),
        totalSavingsIncome: n(sa.totalSavingsIncome),
        statePensionsTotal: n(sa.statePensionsTotal),
        privatePensions: n(sa.privatePensions),
        giftAidPayments: n(sa.giftAidPayments),
        hasPaymentsOnAccount: sa.hasPaymentsOnAccount ?? null,
        poaThisYearJan: n(sa.poaThisYearJan),
        poaThisYearJul: n(sa.poaThisYearJul),
        poaNextYearJan: n(sa.poaNextYearJan),
        poaNextYearJul: n(sa.poaNextYearJul),
        childBenefit: n(sa.childBenefit),
        totalTaxDue: n(sa.totalTaxDue),
        class2NicDue: sa.class2NicDue ?? null,
      });
    }
  }

  // ─── Phase 3: bulk upsert all child tables ────────────────────────────────
  try {
    await bulkUpsert(taxReferencesTable, taxRefRows, taxReferencesTable.clientId, ["id", "clientId"]);
  } catch (e: any) {
    errors.push(`TaxRefs bulk: ${e.message}`);
  }

  try {
    await bulkUpsert(financialInfoTable, fiRows, financialInfoTable.clientId, ["id", "clientId"]);
  } catch (e: any) {
    errors.push(`FinancialInfo bulk: ${e.message}`);
  }

  try {
    await bulkUpsert(clientFeesTable, feesRows, clientFeesTable.clientId, ["id", "clientId"]);
  } catch (e: any) {
    errors.push(`ClientFees bulk: ${e.message}`);
  }

  try {
    await bulkUpsert(
      ctReturnsTable,
      ctRows,
      [ctReturnsTable.clientId, ctReturnsTable.ctPeriodStart, ctReturnsTable.ctPeriodEnd],
      ["id", "clientId", "ctPeriodStart", "ctPeriodEnd"],
    );
  } catch (e: any) {
    errors.push(`CtReturns bulk: ${e.message}`);
  }

  try {
    await bulkUpsert(
      accountsPeriodsTable,
      apRows,
      [accountsPeriodsTable.clientId, accountsPeriodsTable.periodStart, accountsPeriodsTable.periodEnd],
      ["id", "clientId", "periodStart", "periodEnd"],
    );
  } catch (e: any) {
    errors.push(`AccountsPeriods bulk: ${e.message}`);
  }

  try {
    await bulkUpsert(companiesHouseTable, chRows, companiesHouseTable.clientId, ["id", "clientId"]);
  } catch (e: any) {
    errors.push(`CompaniesHouse bulk: ${e.message}`);
  }

  try {
    await bulkUpsert(mtdItsaTable, mtdRows, mtdItsaTable.clientId, ["id", "clientId"]);
  } catch (e: any) {
    errors.push(`MtdItsa bulk: ${e.message}`);
  }

  // ─── Phase 4: SA returns — bulk delete then bulk insert ───────────────────
  const affectedClientIds = [...clientIdMap.values()];
  try {
    // Delete in chunks of 1000 to stay within postgres parameter limits
    for (let i = 0; i < affectedClientIds.length; i += 1000) {
      await db
        .delete(saReturnsTable)
        .where(inArray(saReturnsTable.clientId, affectedClientIds.slice(i, i + 1000)));
    }
    // Insert in chunks of 500
    for (let i = 0; i < saRows.length; i += 500) {
      await db.insert(saReturnsTable).values(saRows.slice(i, i + 500));
    }
  } catch (e: any) {
    errors.push(`SaReturns bulk: ${e.message}`);
  }

  return {
    clientsAdded,
    clientsUpdated,
    saReturnsCount: saRows.length,
    ctReturnsCount: ctRows.length,
    accountsPeriodsCount: apRows.length,
    errors,
  };
}
