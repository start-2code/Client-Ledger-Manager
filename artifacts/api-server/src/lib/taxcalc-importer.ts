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
  importBatchesTable,
} from "@workspace/db";
import { eq, inArray, notInArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { ClientRecord, SaReturnData } from "./taxcalc-parser.js";

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

export interface ImportResult {
  clientsAdded: number;
  clientsUpdated: number;
  clientsRemoved: number;
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
  options: { importedBy?: string; filename?: string } = {}
): Promise<ImportResult> {
  const errors: string[] = [];
  let clientsAdded = 0;
  let clientsUpdated = 0;
  let clientsRemoved = 0;
  let saReturnsCount = 0;
  let ctReturnsCount = 0;
  let accountsPeriodsCount = 0;

  const incomingCodes = [...clients.keys()];

  // Get existing client codes and their IDs
  const existing = await db.select({ id: clientsTable.id, code: clientsTable.code }).from(clientsTable);
  const existingMap = new Map(existing.map((e) => [e.code, e.id]));
  const existingCodes = new Set(existing.map((e) => e.code));
  const incomingSet = new Set(incomingCodes);

  // Build the code→id map for new/existing clients
  const codeToId = new Map<string, number>();

  // Run everything in a transaction
  await db.transaction(async (tx) => {
    // 1. Delete clients that are no longer in TaxCalc
    const removedCodes = existing.filter((e) => !incomingSet.has(e.code)).map((e) => e.code);
    if (removedCodes.length > 0) {
      const removedIds = removedCodes.map((c) => existingMap.get(c)!);
      // Delete all TaxCalc-sourced child records for removed clients
      await tx.delete(clientsTable).where(
        inArray(clientsTable.code, removedCodes)
      );
      clientsRemoved = removedCodes.length;
    }

    // 2. Upsert all clients
    for (const [code, cr] of clients) {
      try {
        const clientData = {
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
          gender: n(cr.gender),
          maritalStatus: n(cr.maritalStatus),
          dateOfBirth: n(cr.dateOfBirth),
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
        };

        if (existingCodes.has(code)) {
          const [updated] = await tx
            .update(clientsTable)
            .set(clientData)
            .where(eq(clientsTable.code, code))
            .returning({ id: clientsTable.id });
          if (updated) codeToId.set(code, updated.id);
          clientsUpdated++;
        } else {
          const [inserted] = await tx
            .insert(clientsTable)
            .values(clientData)
            .returning({ id: clientsTable.id });
          if (inserted) codeToId.set(code, inserted.id);
          clientsAdded++;
        }
      } catch (e: any) {
        errors.push(`Client ${code}: ${e.message}`);
      }
    }

    // 3. For each client, upsert child tables
    for (const [code, cr] of clients) {
      const clientId = codeToId.get(code) ?? existingMap.get(code);
      if (!clientId) continue;

      // Tax references
      try {
        const tr = cr.taxRef;
        const trData = {
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
        };
        await tx
          .insert(taxReferencesTable)
          .values(trData)
          .onConflictDoUpdate({ target: taxReferencesTable.clientId, set: trData });
      } catch (e: any) {
        errors.push(`TaxRef ${code}: ${e.message}`);
      }

      // Financial info
      try {
        const f = cr.financial;
        const fiData = {
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
        };
        await tx
          .insert(financialInfoTable)
          .values(fiData)
          .onConflictDoUpdate({ target: financialInfoTable.clientId, set: fiData });
      } catch (e: any) {
        errors.push(`FinancialInfo ${code}: ${e.message}`);
      }

      // Client fees
      try {
        const f = cr.fees;
        const feesData = {
          clientId,
          annualAccountsFlag: b(f["annualAccountsFlag"]),
          annualAccountsFee: n(f["annualAccountsFee"]),
          taxReturnFlag: b(f["taxReturnFlag"]),
          taxReturnFee: n(f["taxReturnFee"]),
          auditFlag: b(f["auditFlag"]),
          auditFee: n(f["auditFee"]),
          bookkeepingFlag: b(f["bookkeepingFlag"]),
          bookkeepingFee: n(f["bookkeepingFee"]),
          vatReturnsFlag: b(f["vatReturnsFlag"]),
          vatReturnsFee: n(f["vatReturnsFee"]),
          payrollFlag: b(f["payrollFlag"]),
          payrollFee: n(f["payrollFee"]),
          consultancyFlag: b(f["consultancyFlag"]),
          consultancyFee: n(f["consultancyFee"]),
          cashflowFlag: b(f["cashflowFlag"]),
          cashflowFee: n(f["cashflowFee"]),
          managementAccountsFlag: b(f["managementAccountsFlag"]),
          managementAccountsFee: n(f["managementAccountsFee"]),
          companySecretarialFlag: b(f["companySecretarialFlag"]),
          companySecretarialFee: n(f["companySecretarialFee"]),
          otherFlag: b(f["otherFlag"]),
          otherFee: n(f["otherFee"]),
          totalFee: n(f["totalFee"]),
          recordsReceivedAnnual: n(f["recordsReceivedAnnual"]),
          recordsReceivedQ1: n(f["recordsReceivedQ1"]),
          recordsReceivedQ1Revised: n(f["recordsReceivedQ1Revised"]),
          recordsReceivedQ2: n(f["recordsReceivedQ2"]),
          recordsReceivedQ3: n(f["recordsReceivedQ3"]),
          recordsReceivedQ4: n(f["recordsReceivedQ4"]),
        };
        await tx
          .insert(clientFeesTable)
          .values(feesData)
          .onConflictDoUpdate({ target: clientFeesTable.clientId, set: feesData });
      } catch (e: any) {
        errors.push(`Fees ${code}: ${e.message}`);
      }

      // SA returns — delete all existing for this client then re-insert
      try {
        await tx.delete(saReturnsTable).where(eq(saReturnsTable.clientId, clientId));
        for (const [key, sa] of cr.saReturns) {
          const [yearStr] = key.split("_");
          const saData = {
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
          };
          await tx.insert(saReturnsTable).values(saData);
          saReturnsCount++;
        }
      } catch (e: any) {
        errors.push(`SaReturns ${code}: ${e.message}`);
      }

      // CT return
      try {
        const ct = cr.ctReturn;
        if (Object.keys(ct).length > 0) {
          const ctData = {
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
            lossesCarriedBack: ct["lossesCarriedBack"] as boolean ?? null,
            tradingLossesBfwdUsed: n(ct["tradingLossesBfwdUsed"] as string),
            totalDeductionsAndReliefs: n(ct["totalDeductionsAndReliefs"] as string),
            profitsChargeableToCt: n(ct["profitsChargeableToCt"] as string),
            noAssociatedCompanies: ct["noAssociatedCompanies"] !== null ? Number(ct["noAssociatedCompanies"]) || null : null,
            noAssociatedCompaniesFy1: ct["noAssociatedCompaniesFy1"] !== null ? Number(ct["noAssociatedCompaniesFy1"]) || null : null,
            noAssociatedCompaniesFy2: ct["noAssociatedCompaniesFy2"] !== null ? Number(ct["noAssociatedCompaniesFy2"]) || null : null,
            smallProfitRateOrMarginalRelief: ct["smallProfitRateOrMarginalRelief"] as boolean ?? null,
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
            liableToLargeCompanyInstalments: ct["liableToLargeCompanyInstalments"] as boolean ?? null,
            liableToVeryLargeCompanyInstalments: ct["liableToVeryLargeCompanyInstalments"] as boolean ?? null,
            withinGroupPaymentsArrangement: ct["withinGroupPaymentsArrangement"] as boolean ?? null,
            rdClaimBySme: ct["rdClaimBySme"] as boolean ?? null,
            rdClaimByLargeCompany: ct["rdClaimByLargeCompany"] as boolean ?? null,
            rdNotificationFormSubmitted: ct["rdNotificationFormSubmitted"] as boolean ?? null,
            additionalInformationFormSubmitted: ct["additionalInformationFormSubmitted"] as boolean ?? null,
            smeRdExpenditure: n(ct["smeRdExpenditure"] as string),
            rdEnhancedExpenditure: n(ct["rdEnhancedExpenditure"] as string),
            creativeExpenditure: n(ct["creativeExpenditure"] as string),
            rdAndCreativeEnhancedExpenditure: n(ct["rdAndCreativeEnhancedExpenditure"] as string),
            rdEnhancedExpenditureIncSubcontracted: n(ct["rdEnhancedExpenditureIncSubcontracted"] as string),
            ct600a: ct["ct600a"] as boolean ?? null,
            ct600b: ct["ct600b"] as boolean ?? null,
            ct600c: ct["ct600c"] as boolean ?? null,
            ct600d: ct["ct600d"] as boolean ?? null,
            ct600e: ct["ct600e"] as boolean ?? null,
            ct600f: ct["ct600f"] as boolean ?? null,
            ct600g: ct["ct600g"] as boolean ?? null,
            ct600h: ct["ct600h"] as boolean ?? null,
            ct600j: ct["ct600j"] as boolean ?? null,
            ct600k: ct["ct600k"] as boolean ?? null,
            ct600l: ct["ct600l"] as boolean ?? null,
            ct600m: ct["ct600m"] as boolean ?? null,
            ct600n: ct["ct600n"] as boolean ?? null,
            typeOfCompanyCt600: ct["typeOfCompanyCt600"] as boolean ?? null,
            hasRepayment: ct["hasRepayment"] as boolean ?? null,
            claimAffectingEarlierPeriod: ct["claimAffectingEarlierPeriod"] as boolean ?? null,
            northernIrelandTrading: ct["northernIrelandTrading"] as boolean ?? null,
            returnFiledSuccessfully: ct["returnFiledSuccessfully"] as boolean ?? null,
            returnLocked: ct["returnLocked"] as boolean ?? null,
          };
          await tx
            .insert(ctReturnsTable)
            .values(ctData)
            .onConflictDoUpdate({
              target: [ctReturnsTable.clientId, ctReturnsTable.ctPeriodStart, ctReturnsTable.ctPeriodEnd],
              set: ctData,
            });
          ctReturnsCount++;
        }
      } catch (e: any) {
        errors.push(`CtReturn ${code}: ${e.message}`);
      }

      // Accounts period
      try {
        const ap = cr.accountsPeriod;
        if (Object.keys(ap).length > 0) {
          const apData = {
            clientId,
            periodStart: n(ap["periodStart"]),
            periodEnd: n(ap["periodEnd"]),
            accountsStatus: n(ap["accountsStatus"]),
            periodLocked: b(ap["periodLocked"]),
            accountingStandard: n(ap["accountingStandard"]),
            averageEmployees: n(ap["averageEmployees"]),
          };
          await tx
            .insert(accountsPeriodsTable)
            .values(apData)
            .onConflictDoUpdate({
              target: [accountsPeriodsTable.clientId, accountsPeriodsTable.periodStart, accountsPeriodsTable.periodEnd],
              set: apData,
            });
          accountsPeriodsCount++;
        }
      } catch (e: any) {
        errors.push(`AccountsPeriod ${code}: ${e.message}`);
      }

      // Companies House
      try {
        const ch = cr.chForms;
        const chData = {
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
        };
        await tx
          .insert(companiesHouseTable)
          .values(chData)
          .onConflictDoUpdate({ target: companiesHouseTable.clientId, set: chData });
      } catch (e: any) {
        errors.push(`CompaniesHouse ${code}: ${e.message}`);
      }

      // MTD ITSA
      try {
        const m = cr.mtdItsa;
        const mData = {
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
        };
        await tx
          .insert(mtdItsaTable)
          .values(mData)
          .onConflictDoUpdate({ target: mtdItsaTable.clientId, set: mData });
      } catch (e: any) {
        errors.push(`MtdItsa ${code}: ${e.message}`);
      }
    }
  });

  // Log the import batch
  try {
    await db.insert(importBatchesTable).values({
      importedBy: options.importedBy ?? "system",
      filename: options.filename ?? "taxcalc-export.zip",
      status: errors.length > 0 ? "partial" : "success",
      errorMessage: errors.length > 0 ? errors.slice(0, 5).join("; ") : null,
      totalClients: incomingCodes.length,
      clientsAdded,
      clientsUpdated,
      clientsRemoved,
      saReturnsCount,
      ctReturnsCount,
      accountsPeriodsCount,
      summary: { errors: errors.slice(0, 20) } as any,
    });
  } catch (_) {}

  return { clientsAdded, clientsUpdated, clientsRemoved, saReturnsCount, ctReturnsCount, accountsPeriodsCount, errors };
}
