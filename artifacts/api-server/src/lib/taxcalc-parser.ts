import XLSX from "xlsx";

export interface SaReturnData {
  returnType: string;
  returnStatus?: string | null;
  income?: boolean | null;
  netProfit?: boolean | null;
  hasRepayment?: boolean | null;
  repaymentAmount?: string | null;
  returnFiledSuccessfully?: boolean | null;
  returnLocked?: boolean | null;
  dateFiledToHmrc?: string | null;
  dateLastSaved?: string | null;
  dateLastStatusChange?: string | null;
  provisionalFields?: boolean | null;
  hasEmployment?: boolean | null;
  totalEmploymentIncome?: string | null;
  hasSelfEmployment?: boolean | null;
  totalSelfEmploymentIncome?: string | null;
  totalProfitFromSelfEmployments?: string | null;
  totalLossesFromSelfEmployments?: string | null;
  hasLloyds?: boolean | null;
  hasPartnership?: boolean | null;
  partnershipProfitLoss?: string | null;
  totalProfitFromPartnerships?: string | null;
  totalLossesFromPartnerships?: string | null;
  hasUkProperty?: boolean | null;
  totalUkPropertyProfit?: string | null;
  rentARoom?: boolean | null;
  totalUkPropertyIncome?: string | null;
  hasForeignPages?: boolean | null;
  totalForeignIncome?: string | null;
  totalForeignPropertyIncome?: string | null;
  hasTrusts?: boolean | null;
  totalTrustIncome?: string | null;
  hasCapitalGains?: boolean | null;
  totalCapitalGains?: string | null;
  hasResidenceAndRemittance?: boolean | null;
  notResident?: boolean | null;
  ukLifePolicies?: string | null;
  ukVoidedIsas?: string | null;
  foreignLifePolicies?: string | null;
  adjustedTotalIncome?: string | null;
  totalIncome?: string | null;
  totalProfitFromBusinesses?: string | null;
  totalGrossBusinessIncome?: string | null;
  totalLossesFromBusinesses?: string | null;
  totalSavingsIncome?: string | null;
  statePensionsTotal?: string | null;
  privatePensions?: string | null;
  giftAidPayments?: string | null;
  hasPaymentsOnAccount?: boolean | null;
  poaThisYearJan?: string | null;
  poaThisYearJul?: string | null;
  poaNextYearJan?: string | null;
  poaNextYearJul?: string | null;
  childBenefit?: string | null;
  totalTaxDue?: string | null;
  class2NicDue?: boolean | null;
  furnishedHolidayLettings?: boolean | null;
  furnishedHolidayLettingsIncome?: string | null;
  furnishedHolidayLettingsProfits?: string | null;
}

export interface ClientRecord {
  code: string;
  // Core clients fields
  name?: string;
  type?: string;
  // Personal contact
  title?: string;
  forename?: string;
  middleName?: string;
  surname?: string;
  gender?: string;
  maritalStatus?: string;
  dateOfBirth?: string;
  nationality?: string;
  countryOfResidence?: string;
  // Address
  addressLine1?: string;
  addressLine2?: string;
  town?: string;
  county?: string;
  country?: string;
  postcode?: string;
  contactNumber?: string;
  email?: string;
  // Business
  occupation?: string;
  businessName?: string;
  businessType?: string;
  usualYearEnd?: string;
  anticipatedTurnover?: string;
  industryType?: string;
  enrolledForMtdVat?: string;
  // Company
  dateOfCommencement?: string;
  dateOfCessation?: string;
  limitedLiabilityPartnership?: string;
  companyType?: string;
  countryOfIncorporation?: string;
  dateOfIncorporation?: string;
  tradingStatus?: string;
  isPropertyBusiness?: string;
  companyAuthenticationCode?: string;
  confirmationStatementDate?: string;
  // Practice
  assignedOffice?: string;
  bookkeepingSoftware?: string;
  paymentMethod?: string;
  clientCreationDate?: string;
  archived?: string;
  amlStatus?: string;
  website?: string;
  // Engagement
  engagementStatus?: string;
  consentType?: string;
  consentStatus?: string;
  methodOfConsent?: string;
  dateOfConsent?: string;
  dateOfLatestEngagement?: string;
  dateOfClientLoss?: string;
  // Practice flags
  smartvaultFlag?: string;
  engagerFlag?: string;
  portfolioFlag?: string;
  status64_8?: string;
  date64_8Completion?: string;
  // Tax references
  taxRef: {
    utr?: string;
    payeRef?: string;
    payeAccountsOfficeRef?: string;
    vatRegNo?: string;
    vatRegDate?: string;
    vatDeRegistrationDate?: string;
    vatPeriodEnd?: string;
    vatScheme?: string;
    vatFlatRateScheme?: string;
    ecSalesListPeriod?: string;
    niNumber?: string;
    companyRegNo?: string;
    taxOffice?: string;
    taxOfficeTelephone?: string;
    taxOfficeAddress1?: string;
    taxOfficeAddress2?: string;
    taxOfficeTown?: string;
    taxOfficeCounty?: string;
    taxOfficePostcode?: string;
    enrolledForMtdIncomeTax?: string;
    amlLastCheckDate?: string;
    p11dDispensation?: string;
    pensionAutoEnrolmentDate?: string;
    constructionIndustryScheme?: string;
    individualIsPscNotDirector?: string;
    individualIsPscAndDirector?: string;
    vs01SubmissionDeadline?: string;
    latestAccountsStatus?: string;
    latestCt600Status?: string;
  };
  // Financial
  financial: Record<string, string | null>;
  // Fees
  fees: Record<string, string | null>;
  // Companies House
  chForms: Record<string, string | null>;
  // MTD ITSA
  mtdItsa: Record<string, string | null>;
  // SA returns keyed by "YYYY_type" e.g. "2025_personal"
  saReturns: Map<string, SaReturnData>;
  // CT return
  ctReturn: Record<string, string | boolean | null>;
  // Accounts period
  accountsPeriod: Record<string, string | null>;
}

// Excel serial date to ISO string
function excelDateToISO(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "" || trimmed === "No" || trimmed === "null") return null;
    return trimmed;
  }
  if (typeof val === "number" && val > 25569 && val < 100000) {
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().split("T")[0];
  }
  return null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "" || s === "null") return null;
  return s;
}

function num(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return String(v);
  const s = String(v).trim();
  if (s === "" || s === "null" || s === "No") return null;
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? null : String(n);
}

function bool(v: unknown): boolean | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "yes" || s === "true") return true;
  if (s === "no" || s === "false" || s === "notset") return false;
  return null;
}

// Extract zip entries using manual central directory parsing
function extractZipEntries(zipBuf: Buffer): Array<{ filename: string; data: Buffer }> {
  const buf = zipBuf;
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("Not a valid ZIP file");

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const centralDirOffset = buf.readUInt32LE(eocdOffset + 16);

  const result: Array<{ filename: string; data: Buffer }> = [];
  let off = centralDirOffset;
  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const fnLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const compSize = buf.readUInt32LE(off + 20);
    const filename = buf.toString("utf8", off + 46, off + 46 + fnLen);
    const localFnLen = buf.readUInt16LE(localOff + 26);
    const localExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + localFnLen + localExtraLen;
    const data = buf.slice(dataStart, dataStart + compSize);
    result.push({ filename, data });
    off += 46 + fnLen + extraLen + commentLen;
  }
  return result;
}

function getDbNum(filename: string): number | null {
  const m = filename.match(/DB#(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function parseXls(data: Buffer): Array<Record<string, unknown>> {
  const wb = XLSX.read(data, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: null }) as Array<Record<string, unknown>>;
}

function parseXlsArray(data: Buffer, maxRows = 0): Array<Array<unknown>> {
  const wb = XLSX.read(data, { type: "buffer", sheetRows: maxRows || undefined });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as Array<Array<unknown>>;
}

function ensureClient(map: Map<string, ClientRecord>, code: string): ClientRecord {
  if (!map.has(code)) {
    map.set(code, {
      code,
      taxRef: {},
      financial: {},
      fees: {},
      chForms: {},
      mtdItsa: {},
      saReturns: new Map(),
      ctReturn: {},
      accountsPeriod: {},
    });
  }
  return map.get(code)!;
}

function ensureSaReturn(client: ClientRecord, key: string, returnType: string): SaReturnData {
  if (!client.saReturns.has(key)) {
    client.saReturns.set(key, { returnType });
  }
  return client.saReturns.get(key)!;
}

// --- File handlers ---

function handleDb3(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.title = str(row["Title"]) ?? c.title;
    c.forename = str(row["Forename"]) ?? c.forename;
    c.middleName = str(row["Middle name"]) ?? c.middleName;
    c.surname = str(row["Surname"]) ?? c.surname;
    c.gender = str(row["Gender"]) ?? c.gender;
    c.maritalStatus = str(row["Marital status"]) ?? c.maritalStatus;
    c.dateOfBirth = excelDateToISO(row["Date of Birth"]) ?? c.dateOfBirth;
    c.countryOfResidence = str(row["Country of residence"]) ?? c.countryOfResidence;
    c.nationality = str(row["Nationality"]) ?? c.nationality;
  }
}

function handleDb4(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.occupation = str(row["Occupation"]) ?? c.occupation;
    c.businessName = str(row["Business Name"]) ?? c.businessName;
    c.businessType = str(row["Business type"]) ?? c.businessType;
    c.usualYearEnd = str(row["Usual Year End"]) ?? c.usualYearEnd;
    c.anticipatedTurnover = num(row["Anticipated Turnover (Trading)"]) ?? c.anticipatedTurnover;
    c.industryType = str(row["Industry type"]) ?? c.industryType;
    c.enrolledForMtdVat = str(row["Enrolled for MTD VAT"]) ?? c.enrolledForMtdVat;
    const seNotAligned = str(row["SE Accounting period not aligned with the tax year"]);
    if (seNotAligned) c.mtdItsa["seAccountingPeriodNotAligned"] = seNotAligned;
    const pshipNotAligned = str(row["PShip Basis period not aligned with the tax year"]);
    if (pshipNotAligned) c.mtdItsa["pshipBasisPeriodNotAligned"] = pshipNotAligned;
  }
}

function handleDb5(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.dateOfCommencement = excelDateToISO(row["Date of commencement"]) ?? c.dateOfCommencement;
    c.dateOfCessation = str(row["Date of cessation"]) ?? c.dateOfCessation;
    c.limitedLiabilityPartnership = str(row["Limited Liability Partnership"]) ?? c.limitedLiabilityPartnership;
    c.companyType = str(row["Company type"]) ?? c.companyType;
    c.countryOfIncorporation = str(row["Country of incorporation"]) ?? c.countryOfIncorporation;
    c.dateOfIncorporation = excelDateToISO(row["Date of incorporation"]) ?? c.dateOfIncorporation;
    c.confirmationStatementDate = excelDateToISO(row["Confirmation Statement Date"]) ?? c.confirmationStatementDate;
    c.tradingStatus = str(row["Trading status"]) ?? c.tradingStatus;
    c.isPropertyBusiness = str(row["Is property business?"]) ?? c.isPropertyBusiness;
    c.companyAuthenticationCode = str(row["Company authentication code"]) ?? c.companyAuthenticationCode;
  }
}

function handleDb6(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.addressLine1 = str(row["Address line 1"]) ?? c.addressLine1;
    c.addressLine2 = str(row["Address line 2"]) ?? c.addressLine2;
    c.town = str(row["Town"]) ?? c.town;
    c.county = str(row["County"]) ?? c.county;
    c.country = str(row["Country"]) ?? c.country;
    c.postcode = str(row["Postcode"]) ?? c.postcode;
    c.contactNumber = str(row["Contact number"]) ?? c.contactNumber;
    c.email = str(row["Email address"]) ?? c.email;
  }
}

function handleDb7(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  const seen = new Set<string>();
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    if (!seen.has(code)) {
      seen.add(code);
      c.consentType = str(row["Consent Type"]) ?? c.consentType;
      c.consentStatus = str(row["Consent Status"]) ?? c.consentStatus;
      c.methodOfConsent = excelDateToISO(row["Method of Consent"]) ?? str(row["Method of Consent"]) ?? c.methodOfConsent;
      c.dateOfConsent = excelDateToISO(row["Date of Consent"]) ?? c.dateOfConsent;
      c.engagementStatus = str(row["Engagement status"]) ?? c.engagementStatus;
      c.dateOfLatestEngagement = excelDateToISO(row["Date of latest engagement"]) ?? c.dateOfLatestEngagement;
      c.dateOfClientLoss = excelDateToISO(row["Date of client loss"]) ?? c.dateOfClientLoss;
    }
  }
}

function handleDb8(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.date64_8Completion = excelDateToISO(row["64-8 completion date"]) ?? c.date64_8Completion;
    c.status64_8 = str(row["64-8 status"]) ?? c.status64_8;
    c.taxRef.amlLastCheckDate = excelDateToISO(row["Last AML check date"]) ?? str(row["Last AML check date"]) ?? c.taxRef.amlLastCheckDate;
    c.assignedOffice = str(row["Assigned to office"]) ?? c.assignedOffice;
    c.bookkeepingSoftware = str(row["Bookkeeping software"]) ?? c.bookkeepingSoftware;
    c.paymentMethod = str(row["Payment method"]) ?? c.paymentMethod;
    c.taxRef.taxOffice = str(row["Tax office code"]) ?? str(row["Tax office"]) ?? c.taxRef.taxOffice;
    c.taxRef.taxOfficeAddress1 = str(row["Tax office address line 1"]) ?? c.taxRef.taxOfficeAddress1;
    c.taxRef.taxOfficeAddress2 = str(row["Tax office address line 2"]) ?? c.taxRef.taxOfficeAddress2;
    c.taxRef.taxOfficeTown = str(row["Tax office address town"]) ?? c.taxRef.taxOfficeTown;
    c.taxRef.taxOfficeCounty = str(row["Tax office address county"]) ?? c.taxRef.taxOfficeCounty;
    c.taxRef.taxOfficePostcode = str(row["Tax office address postcode"]) ?? c.taxRef.taxOfficePostcode;
  }
}

function handleDb9(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.taxRef.taxOfficeTelephone = str(row["Tax office telephone"]) ?? c.taxRef.taxOfficeTelephone;
    c.taxRef.utr = str(row["Unique tax reference"]) ?? c.taxRef.utr;
    c.taxRef.payeRef = str(row["PAYE reference"]) ?? c.taxRef.payeRef;
    c.taxRef.payeAccountsOfficeRef = str(row["PAYE accounts office reference"]) ?? c.taxRef.payeAccountsOfficeRef;
    c.taxRef.niNumber = str(row["National insurance number"]) ?? c.taxRef.niNumber;
    c.taxRef.enrolledForMtdIncomeTax = str(row["Enrolled for MTD Income Tax (ITSA)"]) ?? c.taxRef.enrolledForMtdIncomeTax;
    c.fees["annualAccountsFlag"] = str(row["Annual accounts ?"]) ?? c.fees["annualAccountsFlag"];
    c.fees["annualAccountsFee"] = num(row["Annual accounts fee"]) ?? c.fees["annualAccountsFee"];
    c.fees["taxReturnFlag"] = str(row["Tax return ?"]) ?? c.fees["taxReturnFlag"];
    c.fees["taxReturnFee"] = num(row["Tax return fee"]) ?? c.fees["taxReturnFee"];
    c.fees["companySecretarialFlag"] = str(row["Company secretarial ?"]) ?? c.fees["companySecretarialFlag"];
    c.fees["companySecretarialFee"] = num(row["Company secretarial fee"]) ?? c.fees["companySecretarialFee"];
  }
}

function handleDb10(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.fees["auditFlag"] = str(row["Audit ?"]) ?? c.fees["auditFlag"];
    c.fees["auditFee"] = num(row["Audit fee"]) ?? c.fees["auditFee"];
    c.fees["bookkeepingFlag"] = str(row["Bookkeeping ?"]) ?? c.fees["bookkeepingFlag"];
    c.fees["bookkeepingFee"] = num(row["Bookkeeping fee"]) ?? c.fees["bookkeepingFee"];
    c.fees["vatReturnsFlag"] = str(row["VAT returns ?"]) ?? c.fees["vatReturnsFlag"];
    c.fees["vatReturnsFee"] = num(row["VAT returns fee"]) ?? c.fees["vatReturnsFee"];
    c.fees["payrollFlag"] = str(row["Payroll ?"]) ?? c.fees["payrollFlag"];
    c.fees["payrollFee"] = num(row["Payroll fee"]) ?? c.fees["payrollFee"];
    c.fees["consultancyFlag"] = str(row["Consultancy ?"]) ?? c.fees["consultancyFlag"];
    c.fees["consultancyFee"] = num(row["Consultancy fee"]) ?? c.fees["consultancyFee"];
    c.fees["cashflowFlag"] = str(row["Cashflow ?"]) ?? c.fees["cashflowFlag"];
    c.fees["cashflowFee"] = num(row["Cashflow fee"]) ?? c.fees["cashflowFee"];
  }
}

// DB#11 uses a sparse left-packed format. The Nanotax export does NOT use fixed column
// positions matching the header row. Instead, each row contains only its non-null values
// left-packed after the client code. The last 2 non-null values are always client type
// and client name. Any values preceding them are fee fields in this order:
//   mgmt_flag, mgmt_fee, total_fee [, records_annual, q1, q1r, q2, q3, q4]
// Clients with no fee data:      [code, type, name]
// Clients with mgmt accounts:    [code, mgmt_flag, mgmt_fee, total_fee, type, name]
function handleDb11(rawRows: unknown[][], clients: Map<string, ClientRecord>) {
  for (const row of rawRows) {
    const code = str(row[0]);
    if (!code) continue;
    const c = ensureClient(clients, code);

    // Collect non-null values after the code
    const nonNull = (row as unknown[]).slice(1)
      .map((v, i) => ({ i, v }))
      .filter(x => x.v !== null);
    if (nonNull.length === 0) continue;

    // Last 2 non-null entries are always type and name
    const nameIdx  = nonNull.length - 1;
    const typeIdx  = nonNull.length - 2;
    if (!c.name) c.name = str(nonNull[nameIdx].v) ?? undefined;
    if (nonNull.length >= 2 && !c.type) c.type = str(nonNull[typeIdx].v) ?? undefined;

    // Preceding non-null entries are fee fields: mgmt_flag, mgmt_fee, total_fee, then records
    const feeEntries = nonNull.slice(0, nonNull.length >= 2 ? -2 : -1);
    if (feeEntries.length >= 1) c.fees["managementAccountsFlag"] = str(feeEntries[0].v) ?? c.fees["managementAccountsFlag"];
    if (feeEntries.length >= 2) c.fees["managementAccountsFee"] = num(feeEntries[1].v) ?? c.fees["managementAccountsFee"];
    if (feeEntries.length >= 3) c.fees["totalFee"] = num(feeEntries[2].v) ?? c.fees["totalFee"];
    if (feeEntries.length >= 4) c.fees["recordsReceivedAnnual"] = excelDateToISO(feeEntries[3].v) ?? str(feeEntries[3].v) ?? c.fees["recordsReceivedAnnual"];
    if (feeEntries.length >= 5) c.fees["recordsReceivedQ1"] = excelDateToISO(feeEntries[4].v) ?? str(feeEntries[4].v) ?? c.fees["recordsReceivedQ1"];
    if (feeEntries.length >= 6) c.fees["recordsReceivedQ1Revised"] = excelDateToISO(feeEntries[5].v) ?? str(feeEntries[5].v) ?? c.fees["recordsReceivedQ1Revised"];
    if (feeEntries.length >= 7) c.fees["recordsReceivedQ2"] = excelDateToISO(feeEntries[6].v) ?? str(feeEntries[6].v) ?? c.fees["recordsReceivedQ2"];
    if (feeEntries.length >= 8) c.fees["recordsReceivedQ3"] = excelDateToISO(feeEntries[7].v) ?? str(feeEntries[7].v) ?? c.fees["recordsReceivedQ3"];
    if (feeEntries.length >= 9) c.fees["recordsReceivedQ4"] = excelDateToISO(feeEntries[8].v) ?? str(feeEntries[8].v) ?? c.fees["recordsReceivedQ4"];
  }
}

function handleDb12(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.clientCreationDate = excelDateToISO(row["Client creation date"]) ?? c.clientCreationDate;
    c.archived = str(row["Archived"]) ?? c.archived;
    c.website = str(row["Website address"]) ?? c.website;
    c.taxRef.companyRegNo = str(row["Company registration number"]) ?? c.taxRef.companyRegNo;
    c.amlStatus = str(row["AML status"]) ?? c.amlStatus;
    c.taxRef.p11dDispensation = str(row["P11D dispensation"]) ?? c.taxRef.p11dDispensation;
    c.taxRef.pensionAutoEnrolmentDate = excelDateToISO(row["Pension auto-enrolment date"]) ?? c.taxRef.pensionAutoEnrolmentDate;
    c.taxRef.constructionIndustryScheme = str(row["Construction industry scheme"]) ?? c.taxRef.constructionIndustryScheme;
    if (!c.usualYearEnd) c.usualYearEnd = str(row["Usual Year End day/month (client or business 1)"]) ?? undefined;
    c.taxRef.individualIsPscNotDirector = str(row["Individual is a PSC and not director of the same company"]) ?? c.taxRef.individualIsPscNotDirector;
    c.taxRef.individualIsPscAndDirector = str(row["Individual is a PSC and director of the same company"]) ?? c.taxRef.individualIsPscAndDirector;
    c.chForms["vs01SubmissionDeadline"] = excelDateToISO(row["VS01 Submission Deadline"]) ?? c.chForms["vs01SubmissionDeadline"];
  }
}

function handleDb13(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.accountsPeriod["periodStart"] = excelDateToISO(row["Accounting period start date (Latest)"]) ?? c.accountsPeriod["periodStart"];
    c.accountsPeriod["periodEnd"] = excelDateToISO(row["Accounting period end date (Latest)"]) ?? str(row["Accounting period end date (Latest)"]) ?? c.accountsPeriod["periodEnd"];
    c.accountsPeriod["accountsStatus"] = str(row["Accounts submission status (Latest)"]) ?? c.accountsPeriod["accountsStatus"];
    c.accountsPeriod["periodLocked"] = str(row["Accounting period locked? (Latest)"]) ?? c.accountsPeriod["periodLocked"];
    c.accountsPeriod["accountingStandard"] = str(row["Accounting standard (Latest)"]) ?? c.accountsPeriod["accountingStandard"];
    c.accountsPeriod["averageEmployees"] = num(row["Average number of employees (Latest)"]) ?? c.accountsPeriod["averageEmployees"];
  }
}

function handleDb14(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.mtdItsa["dateOfLastSubmission26"] = excelDateToISO(row["Date of last submission (MTD for Income Tax 26)"]) ?? c.mtdItsa["dateOfLastSubmission26"];
    c.mtdItsa["periodEndOfLastSubmission26"] = excelDateToISO(row["Period end of last submission (MTD for Income Tax 26)"]) ?? c.mtdItsa["periodEndOfLastSubmission26"];
    c.mtdItsa["lastSubmissionSuccessful26"] = str(row["Last submission successful? (MTD for Income Tax 26)"]) ?? c.mtdItsa["lastSubmissionSuccessful26"];
    c.mtdItsa["annualisedIncomeSelfEmployment"] = num(row["Annualised income from self-employment"]) ?? c.mtdItsa["annualisedIncomeSelfEmployment"];
  }
}

function handleDb15(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  const seen = new Set<string>();
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    if (!seen.has(code)) {
      seen.add(code);
      c.taxRef.vatRegNo = str(row["VAT registration no."]) ?? c.taxRef.vatRegNo;
      c.taxRef.vatRegDate = excelDateToISO(row["VAT registration date"]) ?? str(row["VAT registration date"]) ?? c.taxRef.vatRegDate;
      c.taxRef.vatDeRegistrationDate = excelDateToISO(row["VAT de-registration date"]) ?? c.taxRef.vatDeRegistrationDate;
      c.taxRef.vatPeriodEnd = str(row["VAT period end"]) ?? c.taxRef.vatPeriodEnd;
      c.taxRef.vatScheme = str(row["VAT scheme"]) ?? c.taxRef.vatScheme;
      c.taxRef.vatFlatRateScheme = str(row["VAT flat rate scheme"]) ?? c.taxRef.vatFlatRateScheme;
      c.taxRef.ecSalesListPeriod = str(row["EC Sales List return period"]) ?? c.taxRef.ecSalesListPeriod;
    }
  }
}

function handleDb16(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  const seen = new Set<string>();
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    if (!seen.has(code)) {
      seen.add(code);
      c.chForms["relationshipClientCode"] = str(row["Relationship Client Code"]) ?? c.chForms["relationshipClientCode"];
      c.chForms["mtd2026Q1"] = str(row["2026/Q1 MTD status"]) ?? c.chForms["mtd2026Q1"];
      c.chForms["mtd2026Q2"] = str(row["2026/Q2 MTD status"]) ?? c.chForms["mtd2026Q2"];
      c.chForms["mtd2026Q3"] = str(row["2026/Q3 MTD status"]) ?? c.chForms["mtd2026Q3"];
      c.chForms["mtd2026Q4"] = str(row["2026/Q4 MTD status"]) ?? c.chForms["mtd2026Q4"];
      c.chForms["mtd2027Q1"] = str(row["2027/Q1 MTD status"]) ?? c.chForms["mtd2027Q1"];
      c.chForms["mtd2027Q2"] = str(row["2027/Q2 MTD status"]) ?? c.chForms["mtd2027Q2"];
      c.chForms["mtd2027Q3"] = str(row["2027/Q3 MTD status"]) ?? c.chForms["mtd2027Q3"];
      c.chForms["mtd2027Q4"] = str(row["2027/Q4 MTD status"]) ?? c.chForms["mtd2027Q4"];
      c.chForms["cs01"] = str(row["CS01"]) ?? c.chForms["cs01"];
      c.chForms["sh01"] = str(row["SH01"]) ?? c.chForms["sh01"];
      c.chForms["ad01"] = str(row["AD01"]) ?? c.chForms["ad01"];
      c.chForms["ad05"] = str(row["AD05"]) ?? c.chForms["ad05"];
    }
  }
}

function handleDb17(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    ["AP01","AP02","AP03","AP04","CH01","CH02","CH03","CH04","TM01","TM02","AA02","AD03","AD04"].forEach(f => {
      const v = str(row[f]);
      if (v !== null) c.chForms[f.toLowerCase()] = v;
    });
  }
}

function handleDb18(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    ["NM01","NM02","NM03","NM04","PSC01","PSC02","PSC04","PSC05","PSC07","PSC08","PSC09"].forEach(f => {
      const v = str(row[f]);
      if (v !== null) c.chForms[f.toLowerCase()] = v;
    });
  }
}

function handleDb19(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    ["AA01","AA03","AA06"].forEach(f => {
      const v = str(row[f]);
      if (v !== null) c.chForms[f.toLowerCase()] = v;
    });
    const ad01 = str(row["AD01"]);
    if (ad01) c.chForms["ad01"] = ad01;
    const ad05 = str(row["AD05"]);
    if (ad05) c.chForms["ad05"] = ad05;
    c.smartvaultFlag = str(row["SmartVault"]) ?? c.smartvaultFlag;
    c.engagerFlag = str(row["Engager.app"]) ?? c.engagerFlag;
    c.portfolioFlag = str(row["Portfolio"]) ?? c.portfolioFlag;
    const em01 = str(row["EM01"]);
    if (em01) c.chForms["em01"] = em01;
  }
}

function handleDb20(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    c.taxRef.latestAccountsStatus = str(row["Latest Accounts status"]) ?? c.taxRef.latestAccountsStatus;
    c.taxRef.latestCt600Status = str(row["Latest CT600 status"]) ?? c.taxRef.latestCt600Status;
    for (let year = 2016; year <= 2026; year++) {
      const status = str(row[`Tax return SA ${year} status`]);
      if (status) {
        const sa = ensureSaReturn(c, `${year}_personal`, "personal");
        sa.returnStatus = status;
      }
    }
  }
}

function handleDb21(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    for (let year = 2013; year <= 2015; year++) {
      const status = str(row[`Tax return SA ${year} status`]);
      if (status) {
        const sa = ensureSaReturn(c, `${year}_personal`, "personal");
        sa.returnStatus = status;
      }
    }
  }
}

function financialMapping(col: string): string | null {
  const m: Record<string, string> = {
    "Turnover": "turnover",
    "Gross Profit": "grossProfit",
    "Operating Profit": "operatingProfit",
    "Other income": "otherIncome",
    "Other interest receivable": "otherInterestReceivable",
    "Interest payable": "interestPayable",
    "Profit before tax": "profitBeforeTax",
    "Profit for the year": "profitForYear",
    "Dividends": "dividends",
    "Intangible assets": "intangibleAssets",
    "Tangible assets": "tangibleAssets",
    "Investment properties": "investmentProperties",
    "Fixed asset investments": "fixedAssetInvestments",
    "Fixed assets": "fixedAssets",
    "Stock": "stock",
    "Debtors": "debtors",
    "Debtors within one year": "debtorsWithinOneYear",
    "Directors loan account overdrawn within one year": "directorsLoanOverdrawnWithin",
    "Directors loan account overdrawn after one year": "directorsLoanOverdrawnAfter",
    "Cash at bank in hand": "cashAtBank",
    "Bank balances": "bankBalances",
    "Current assets": "currentAssets",
    "Creditors within one year": "creditorsWithinOneYear",
    "Directors loan account": "directorsLoanAccount",
    "Bank loans": "bankLoans",
    "Net current assets": "netCurrentAssets",
    "Net assets": "netAssets",
    "Total assets less current liabilities": "totalAssetsLessCurrentLiabilities",
    "Creditors after one year": "creditorsAfterOneYear",
    "Provisions for liabilities": "provisions",
    "Profit and loss account": "profitAndLossAccount",
    "Shareholders funds": "shareholdersFunds",
    "Capital Account": "capitalAccount",
    "Total Members Interest": "totalMembersInterest",
    "Net assets attributable to members": "netAssetsAttributableToMembers",
  };
  return m[col] ?? null;
}

function handleFinancialFile(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    for (const [col, val] of Object.entries(row)) {
      if (col === "Client code") continue;
      const baseCol = col.replace(/ \((?:Company|LLP|Partnership|Individual|Trust),\s*Latest\)$/, "").trim();
      const field = financialMapping(baseCol);
      if (field && val !== null && val !== undefined) {
        c.financial[field] = num(val);
      }
    }
  }
}

function handleCtFile(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>, dbNum: number) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);

    if (dbNum === 34) {
      c.ctReturn["typeOfCompanyCt600"] = bool(row["Type of company (CT600) (Latest)"]);
      c.ctReturn["hasRepayment"] = bool(row["Has Repayment (Latest)"]);
      c.ctReturn["claimAffectingEarlierPeriod"] = bool(row["Claim affecting earlier return period (Latest)"]);
      c.ctReturn["northernIrelandTrading"] = bool(row["Northern Ireland trading activity (Latest)"]);
    } else if (dbNum === 35) {
      c.ctReturn["ct600a"] = bool(row["CT600A - Loans & arrangements (Latest)"]);
      c.ctReturn["ct600b"] = bool(row["CT600B - Controlled foreign companies (Latest)"]);
      c.ctReturn["ct600c"] = bool(row["CT600C - Group and Consortium (Latest)"]);
      c.ctReturn["ct600d"] = bool(row["CT600D - Insurance (Latest)"]);
      c.ctReturn["ct600e"] = bool(row["CT600E - Charities & CASCs (Latest)"]);
      c.ctReturn["ct600f"] = bool(row["CT600F - Tonnage Tax (Latest)"]);
      c.ctReturn["ct600g"] = bool(row["CT600G - Northern Ireland (Latest)"]);
      c.ctReturn["ct600h"] = bool(row["CT600H - Cross-border Royalties (Latest)"]);
    } else if (dbNum === 36) {
      c.ctReturn["ct600j"] = bool(row["CT600J - Disclosure if Tax Avoidance Schemes (Latest)"]);
      c.ctReturn["ct600k"] = bool(row["CT600K - Restitution Tax (Latest)"]);
      c.ctReturn["ct600l"] = bool(row["CT600L - Research and Development (Latest)"]);
      c.ctReturn["ct600m"] = bool(row["CT600M - Freeports and Investment Zones (Latest)"]);
      c.ctReturn["ct600n"] = bool(row["CT600N - Residential Property Developer Tax (RPDT) (Latest)"]);
    } else if (dbNum === 37) {
      c.ctReturn["companyTurnover"] = num(row["Company Turnover (Latest)"]);
      c.ctReturn["tradingProfits"] = num(row["Trading Profits (Latest)"]);
      c.ctReturn["bfwdTradeLossPreApr2017"] = num(row["B/fwd Trade Loss - Pre 04/17 (Latest)"]);
      c.ctReturn["netTradingProfits"] = num(row["Net Trading Profits (Latest)"]);
      c.ctReturn["incomeFromProperty"] = num(row["Income from a property business (Latest)"]);
      c.ctReturn["lossesBfwdAgainstInvestmentIncome"] = num(row["Losses b/fwd against certain investment income (Latest)"]);
      c.ctReturn["ukPropertyLosses"] = num(row["UK property losses for this or earlier period (Latest)"]);
      c.ctReturn["tradingLossesUsed"] = num(row["Trading Losses used (Latest)"]);
      c.ctReturn["lossesCarriedBack"] = bool(row["Losses carried back (Latest)"]);
      c.ctReturn["tradingLossesBfwdUsed"] = num(row["Trading losses b/fwd & used (Latest)"]);
      c.ctReturn["totalDeductionsAndReliefs"] = num(row["Total Deductions and Reliefs (Latest)"]);
    } else if (dbNum === 38) {
      c.ctReturn["profitsChargeableToCt"] = num(row["Profits chargeable to Corporation Tax (Latest)"]);
      c.ctReturn["noAssociatedCompanies"] = num(row["No. of associated companies (Latest)"]);
      c.ctReturn["noAssociatedCompaniesFy1"] = num(row["No. of associated companies, first FY (Latest)"]);
      c.ctReturn["noAssociatedCompaniesFy2"] = num(row["No. of associated companies, second FY (Latest)"]);
      c.ctReturn["smallProfitRateOrMarginalRelief"] = bool(row["Small profit rate or marginal relief (Latest)"]);
      c.ctReturn["corporationTax"] = num(row["Corporation Tax (Latest)"]);
      c.ctReturn["marginalRelief"] = num(row["Marginal Relief (Latest)"]);
      c.ctReturn["ctChargeable"] = num(row["Corporation Tax chargeable (Latest)"]);
      c.ctReturn["netCtLiability"] = num(row["Net Corporation Tax Liability (Latest)"]);
      c.ctReturn["s455TaxPayable"] = num(row["s455 Tax payable (Latest)"]);
      c.ctReturn["incomeTaxDeducted"] = num(row["Income Tax deducted (Latest)"]);
      c.ctReturn["incomeTaxRepayableToCompany"] = num(row["Income Tax repayable to the company (Latest)"]);
      c.ctReturn["selfAssessmentTaxPayable"] = num(row["Self-Assessment of Tax Payable (Latest)"]);
    } else if (dbNum === 39) {
      c.ctReturn["rdCredit"] = num(row["Research and Development credit (Latest)"]);
      c.ctReturn["creativeTaxCredit"] = num(row["Creative tax credit (Latest)"]);
      c.ctReturn["capitalAllowancesCredit"] = num(row["Capital allowances first-year tax credit (Latest)"]);
      c.ctReturn["surplusCreditsPayable"] = num(row["Surplus R&D or Creative credits payable (Latest)"]);
      c.ctReturn["taxAlreadyPaid"] = num(row["Tax already paid (and not already repaid) (Latest)"]);
      c.ctReturn["corporationTaxOutstanding"] = num(row["Corporation Tax Outstanding (Latest)"]);
      c.ctReturn["corporationTaxOverpaid"] = num(row["Corporation Tax Overpaid (Latest)"]);
      c.ctReturn["rdecSurrenderedToCompany"] = num(row["RDEC surrendered to company (Latest)"]);
      c.ctReturn["liableToLargeCompanyInstalments"] = bool(row["Liable to large company instalments (Latest)"]);
      c.ctReturn["liableToVeryLargeCompanyInstalments"] = bool(row["Liable to very large company instalments (Latest)"]);
      c.ctReturn["withinGroupPaymentsArrangement"] = bool(row["Within group payments arrangement (Latest)"]);
    } else if (dbNum === 40) {
      c.ctReturn["rdClaimBySme"] = bool(row["R&D claim by SME (Latest)"]);
      c.ctReturn["rdClaimByLargeCompany"] = bool(row["Claim made by large company (Latest)"]);
      c.ctReturn["rdNotificationFormSubmitted"] = bool(row["R&D claim notification form submitted (Latest)"]);
      c.ctReturn["additionalInformationFormSubmitted"] = bool(row["Additional Information form submitted (Latest)"]);
      c.ctReturn["smeRdExpenditure"] = num(row["SME R&D expenditure (Latest)"]);
      c.ctReturn["rdEnhancedExpenditure"] = num(row["R&D Enhanced Expenditure (Latest)"]);
      c.ctReturn["creativeExpenditure"] = num(row["Creative expenditure (Latest)"]);
      c.ctReturn["rdAndCreativeEnhancedExpenditure"] = num(row["R&D and creative enhanced expenditure (Latest)"]);
      c.ctReturn["rdEnhancedExpenditureIncSubcontracted"] = num(row["R&D enhanced expenditure inc sub-contracted (Latest)"]);
    } else if (dbNum === 41) {
      c.ctReturn["ctPeriodStart"] = excelDateToISO(row["CT period start date (Latest)"]) ?? str(row["CT period start date (Latest)"]);
      c.ctReturn["ctPeriodEnd"] = excelDateToISO(row["CT period end date (Latest)"]) ?? str(row["CT period end date (Latest)"]);
      c.ctReturn["ctPaymentDeadline"] = excelDateToISO(row["CT payment deadline (Latest)"]) ?? str(row["CT payment deadline (Latest)"]);
      c.ctReturn["returnFiledSuccessfully"] = bool(row["CT Return filed successfully? (Latest)"]);
      c.ctReturn["returnLocked"] = bool(row["CT Return locked? (Latest)"]);
    }
  }
}

function handleDb42(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    for (const yearNum of [24, 25, 26]) {
      const year = 2000 + yearNum;
      const key = `${year}_trust`;
      const sa = ensureSaReturn(c, key, "trust");
      const income = bool(row[`Income (Trust Tax ${yearNum})`]);
      if (income !== null) sa.income = income;
      const hasRepayment = bool(row[`Has Repayment (Trust Tax ${yearNum})`]);
      if (hasRepayment !== null) sa.hasRepayment = hasRepayment;
      const filed = bool(row[`SA Return filed successfully? (Trust Tax ${yearNum})`]);
      if (filed !== null) sa.returnFiledSuccessfully = filed;
      const locked = bool(row[`SA Return locked? (Trust Tax ${yearNum})`]);
      if (locked !== null) sa.returnLocked = locked;
    }
  }
}

function handleDb43(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    for (const yearNum of [24, 25, 26]) {
      const year = 2000 + yearNum;
      const key = `${year}_partnership`;
      const sa = ensureSaReturn(c, key, "partnership");
      const income = bool(row[`Income (Partnership Tax ${yearNum})`]);
      if (income !== null) sa.income = income;
      const netProfit = bool(row[`Net Profit (Partnership Tax ${yearNum})`]);
      if (netProfit !== null) sa.netProfit = netProfit;
      const filed = bool(row[`SA Return filed successfully? (Partnership Tax ${yearNum})`]);
      if (filed !== null) sa.returnFiledSuccessfully = filed;
      const locked = bool(row[`SA Return locked? (Partnership Tax ${yearNum})`]);
      if (locked !== null) sa.returnLocked = locked;
    }
  }
}

function handlePersonalTaxIncome(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>, year: number, suffix: string) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    const key = `${year}_personal`;
    const sa = ensureSaReturn(c, key, "personal");
    const yy = `(Personal Tax ${suffix})`;
    sa.hasEmployment = bool(row[`Has employment pages ${yy}`]) ?? sa.hasEmployment;
    sa.totalEmploymentIncome = num(row[`Total employment income ${yy}`]) ?? sa.totalEmploymentIncome;
    sa.hasSelfEmployment = bool(row[`Has self employment pages ${yy}`]) ?? sa.hasSelfEmployment;
    sa.totalSelfEmploymentIncome = num(row[`Total Self Employment Income ${yy}`]) ?? sa.totalSelfEmploymentIncome;
    sa.totalProfitFromSelfEmployments = num(row[`Total Profit from Self Employments ${yy}`]) ?? sa.totalProfitFromSelfEmployments;
    sa.totalLossesFromSelfEmployments = num(row[`Total Losses from Self Employments ${yy}`]) ?? sa.totalLossesFromSelfEmployments;
    sa.hasLloyds = bool(row[`Lloyds ${yy}`]) ?? sa.hasLloyds;
    sa.hasPartnership = bool(row[`Has a partnership ${yy}`]) ?? sa.hasPartnership;
    sa.partnershipProfitLoss = num(row[`Partnership Profit/Loss ${yy}`]) ?? sa.partnershipProfitLoss;
    sa.totalProfitFromPartnerships = num(row[`Total Profit from Partnerships ${yy}`]) ?? sa.totalProfitFromPartnerships;
    sa.totalLossesFromPartnerships = num(row[`Total Losses from Partnerships ${yy}`]) ?? sa.totalLossesFromPartnerships;
  }
}

function handlePersonalTaxProperty(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>, year: number, suffix: string) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    const key = `${year}_personal`;
    const sa = ensureSaReturn(c, key, "personal");
    const yy = `(Personal Tax ${suffix})`;
    sa.hasUkProperty = bool(row[`Has UK Property ${yy}`]) ?? sa.hasUkProperty;
    sa.furnishedHolidayLettings = bool(row[`Furnished Holiday Lettings ${yy}`]) ?? sa.furnishedHolidayLettings;
    sa.furnishedHolidayLettingsIncome = num(row[`Furnished Holiday Lettings Income ${yy}`]) ?? sa.furnishedHolidayLettingsIncome;
    sa.furnishedHolidayLettingsProfits = num(row[`Furnished Holiday Lettings Profits ${yy}`]) ?? sa.furnishedHolidayLettingsProfits;
    sa.rentARoom = bool(row[`Rent a Room ${yy}`]) ?? sa.rentARoom;
    sa.totalUkPropertyIncome = num(row[`Total (Gross) Other Property Income ${yy}`]) ?? num(row[`Total UK Property Income ${yy}`]) ?? sa.totalUkPropertyIncome;
    sa.totalUkPropertyProfit = num(row[`Total UK Property Profit ${yy}`]) ?? sa.totalUkPropertyProfit;
    sa.hasForeignPages = bool(row[`Has Foreign pages ${yy}`]) ?? sa.hasForeignPages;
    sa.totalForeignIncome = num(row[`Total Foreign Income ${yy}`]) ?? sa.totalForeignIncome;
    sa.totalForeignPropertyIncome = num(row[`Total (Gross) Foreign Property Income ${yy}`]) ?? sa.totalForeignPropertyIncome;
    sa.hasTrusts = bool(row[`Trusts ${yy}`]) ?? sa.hasTrusts;
    sa.totalTrustIncome = num(row[`Total Trust Income ${yy}`]) ?? sa.totalTrustIncome;
    sa.hasCapitalGains = bool(row[`Capital Gains ${yy}`]) ?? sa.hasCapitalGains;
    sa.totalCapitalGains = num(row[`Total Capital Gains ${yy}`]) ?? sa.totalCapitalGains;
    sa.hasResidenceAndRemittance = bool(row[`Has Residence and Remittance Pages ${yy}`]) ?? sa.hasResidenceAndRemittance;
    sa.notResident = bool(row[`Not Resident ${yy}`]) ?? sa.notResident;
  }
}

function handlePersonalTaxTotals(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>, year: number, suffix: string) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    const key = `${year}_personal`;
    const sa = ensureSaReturn(c, key, "personal");
    const yy = `(Personal Tax ${suffix})`;
    sa.ukLifePolicies = num(row[`UK Life Policies ${yy}`]) ?? sa.ukLifePolicies;
    sa.ukVoidedIsas = num(row[`UK Voided ISAs ${yy}`]) ?? sa.ukVoidedIsas;
    sa.foreignLifePolicies = num(row[`Foreign Life Policies ${yy}`]) ?? sa.foreignLifePolicies;
    sa.adjustedTotalIncome = num(row[`Adjusted Total Income ${yy}`]) ?? sa.adjustedTotalIncome;
    sa.totalIncome = num(row[`Total income ${yy}`]) ?? sa.totalIncome;
    sa.totalProfitFromBusinesses = num(row[`Total Profit from Businesses ${yy}`]) ?? sa.totalProfitFromBusinesses;
    sa.totalGrossBusinessIncome = num(row[`Total (Gross) business income (trade and property) ${yy}`]) ?? sa.totalGrossBusinessIncome;
    sa.totalLossesFromBusinesses = num(row[`Total Losses from Businesses ${yy}`]) ?? sa.totalLossesFromBusinesses;
    sa.totalSavingsIncome = num(row[`Total savings income ${yy}`]) ?? sa.totalSavingsIncome;
    sa.statePensionsTotal = num(row[`State Pensions and Lump Sum Total ${yy}`]) ?? sa.statePensionsTotal;
    sa.privatePensions = num(row[`Private Pensions ${yy}`]) ?? sa.privatePensions;
    sa.giftAidPayments = num(row[`Gift Aid Payments ${yy}`]) ?? sa.giftAidPayments;
    sa.hasPaymentsOnAccount = bool(row[`Has Payments on Account ${yy}`]) ?? sa.hasPaymentsOnAccount;
  }
}

function handlePersonalTaxStatus(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>, year: number, suffix: string) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    const key = `${year}_personal`;
    const sa = ensureSaReturn(c, key, "personal");
    const yy = `(Personal Tax ${suffix})`;
    sa.poaThisYearJan = num(row[`Payments on Account due this year (Jan) ${yy}`]) ?? sa.poaThisYearJan;
    sa.poaThisYearJul = num(row[`Payments on Account due this year (July) ${yy}`]) ?? sa.poaThisYearJul;
    sa.poaNextYearJan = num(row[`Payments on Account due next year (Jan) ${yy}`]) ?? sa.poaNextYearJan;
    sa.poaNextYearJul = num(row[`Payments on Account due next year (July) ${yy}`]) ?? sa.poaNextYearJul;
    sa.childBenefit = num(row[`Child Benefit ${yy}`]) ?? sa.childBenefit;
    const status = str(row[`Return status ${yy}`]);
    if (status) sa.returnStatus = status;
    sa.dateFiledToHmrc = excelDateToISO(row[`Date filed to HMRC ${yy}`]) ?? sa.dateFiledToHmrc;
    sa.dateLastSaved = excelDateToISO(row[`Date last saved ${yy}`]) ?? sa.dateLastSaved;
    sa.dateLastStatusChange = excelDateToISO(row[`Date last status change ${yy}`]) ?? sa.dateLastStatusChange;
    sa.provisionalFields = bool(row[`Provisional Fields ${yy}`]) ?? sa.provisionalFields;
    sa.hasRepayment = bool(row[`Has Repayment ${yy}`]) ?? sa.hasRepayment;
    sa.repaymentAmount = num(row[`Repayment amount ${yy}`]) ?? sa.repaymentAmount;
  }
}

function handlePersonalTaxDetails(rows: Record<string, unknown>[], clients: Map<string, ClientRecord>, year: number, suffix: string) {
  for (const row of rows) {
    const code = str(row["Client code"]);
    if (!code) continue;
    const c = ensureClient(clients, code);
    const key = `${year}_personal`;
    const sa = ensureSaReturn(c, key, "personal");
    const yy = `(Personal Tax ${suffix})`;
    sa.totalTaxDue = num(row[`Total tax due ${yy}`]) ?? sa.totalTaxDue;
    sa.class2NicDue = bool(row[`Class 2 NIC due ${yy}`]) ?? sa.class2NicDue;
    sa.returnFiledSuccessfully = bool(row[`SA Return filed successfully? ${yy}`]) ?? sa.returnFiledSuccessfully;
    sa.returnLocked = bool(row[`SA Return locked? ${yy}`]) ?? sa.returnLocked;
    // hasRepayment from SA25 (DB#53) - from "Has Repayment (Personal Tax 25)"
    sa.hasRepayment = bool(row[`Has Repayment ${yy}`]) ?? sa.hasRepayment;
    sa.repaymentAmount = num(row[`Repayment amount ${yy}`]) ?? sa.repaymentAmount;
  }
}

export interface ParseResult {
  clients: Map<string, ClientRecord>;
  fileCount: number;
  errors: string[];
}

export function parseTaxCalcZip(zipBuffer: Buffer): ParseResult {
  const errors: string[] = [];
  const clients = new Map<string, ClientRecord>();

  let entries: Array<{ filename: string; data: Buffer }>;
  try {
    entries = extractZipEntries(zipBuffer);
  } catch (e: any) {
    return { clients, fileCount: 0, errors: [`Failed to extract zip: ${e.message}`] };
  }

  let fileCount = 0;
  for (const entry of entries) {
    const dbNum = getDbNum(entry.filename);
    if (!dbNum) continue;
    fileCount++;

    try {
      if (dbNum === 11) {
        const rawRows = parseXlsArray(entry.data);
        if (rawRows.length > 1) handleDb11(rawRows.slice(1), clients);
        continue;
      }

      const rows = parseXls(entry.data);

      switch (dbNum) {
        case 3: handleDb3(rows, clients); break;
        case 4: handleDb4(rows, clients); break;
        case 5: handleDb5(rows, clients); break;
        case 6: handleDb6(rows, clients); break;
        case 7: handleDb7(rows, clients); break;
        case 8: handleDb8(rows, clients); break;
        case 9: handleDb9(rows, clients); break;
        case 10: handleDb10(rows, clients); break;
        case 12: handleDb12(rows, clients); break;
        case 13: handleDb13(rows, clients); break;
        case 14: handleDb14(rows, clients); break;
        case 15: handleDb15(rows, clients); break;
        case 16: handleDb16(rows, clients); break;
        case 17: handleDb17(rows, clients); break;
        case 18: handleDb18(rows, clients); break;
        case 19: handleDb19(rows, clients); break;
        case 20: handleDb20(rows, clients); break;
        case 21: handleDb21(rows, clients); break;
        case 22: case 23: case 24: case 25: case 26: case 27:
        case 28: case 29: case 30: case 31: case 32: case 33:
          handleFinancialFile(rows, clients);
          break;
        case 34: case 35: case 36: case 37: case 38: case 39: case 40: case 41:
          handleCtFile(rows, clients, dbNum);
          break;
        case 42: handleDb42(rows, clients); break;
        case 43: handleDb43(rows, clients); break;
        case 44: handlePersonalTaxIncome(rows, clients, 2026, "26"); break;
        case 45: handlePersonalTaxProperty(rows, clients, 2026, "26"); break;
        case 46: handlePersonalTaxTotals(rows, clients, 2026, "26"); break;
        case 47: handlePersonalTaxStatus(rows, clients, 2026, "26"); break;
        case 48: handlePersonalTaxDetails(rows, clients, 2026, "26"); break;
        case 49: handlePersonalTaxIncome(rows, clients, 2025, "25"); break;
        case 50: handlePersonalTaxProperty(rows, clients, 2025, "25"); break;
        case 51: handlePersonalTaxTotals(rows, clients, 2025, "25"); break;
        case 52: handlePersonalTaxStatus(rows, clients, 2025, "25"); break;
        case 53: handlePersonalTaxDetails(rows, clients, 2025, "25"); break;
      }
    } catch (e: any) {
      errors.push(`DB#${dbNum} (${entry.filename}): ${e.message}`);
    }
  }

  return { clients, fileCount, errors };
}
