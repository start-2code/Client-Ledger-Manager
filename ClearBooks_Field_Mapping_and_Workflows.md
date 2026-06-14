# ClearBooks — Field Mapping & Practice Workflow Guide

_Produced from the live Nanotax import. All 972 clients, 15,264 SA returns, 972 CT returns and 972 accounts periods are currently loaded._

---

## Contents

1. [How the import works](#how-the-import-works)
2. [Field mapping by module](#field-mapping-by-module)
   - [Client — Core & Identity](#1-client--core--identity)
   - [Client — Personal](#2-client--personal)
   - [Client — Address & Contact](#3-client--address--contact)
   - [Client — Business](#4-client--business)
   - [Client — Company](#5-client--company)
   - [Client — Practice & Engagement](#6-client--practice--engagement)
   - [Tax References & Identifiers](#7-tax-references--identifiers)
   - [VAT](#8-vat)
   - [Compliance & AML](#9-compliance--aml)
   - [Services & Fees](#10-services--fees)
   - [Financial Information (Latest Accounts)](#11-financial-information-latest-accounts)
   - [SA Tax Returns (per year, per type)](#12-sa-tax-returns-per-year-per-type)
   - [Corporation Tax Returns](#13-corporation-tax-returns)
   - [Accounts Periods](#14-accounts-periods)
   - [Companies House Filings](#15-companies-house-filings)
   - [MTD ITSA](#16-mtd-itsa)
3. [Suggested practice workflows](#suggested-practice-workflows)

---

## How the import works

The data is exported from Nanotax as a ZIP file containing multiple HTML-as-Excel database files (DB#3 through DB#41+). Each file is parsed and merged into a single client record keyed on **Client Code**. The import is non-destructive for clients — it upserts using COALESCE so existing data is only overwritten when the incoming file contains a value. Child tables (SA returns, CT returns, accounts periods, fees, financial info, tax references) are fully replaced on each import run.

---

## Field Mapping by Module

### 1. Client — Core & Identity

| Field | Source (Nanotax column) | Type | Notes |
|---|---|---|---|
| Client Code | `Client code` | Text | Primary key — never overwritten |
| Name | Derived from DB#11 | Text | Sparse-format column |
| Type | Derived from DB#11 | Text | e.g. Individual, Company, Partnership |
| Archived | `Archived` | Boolean | |
| Client Creation Date | `Client creation date` | Date | |
| Assigned Office | `Assigned to office` | Text | |
| SmartVault Flag | `SmartVault flag` | Text | |
| Engager Flag | `Engager flag` | Text | |
| Portfolio Flag | `Portfolio flag` | Text | |

---

### 2. Client — Personal

_Source: DB#3_

| Field | Nanotax Column | Type |
|---|---|---|
| Title | `Title` | Text |
| Forename | `Forename` | Text |
| Middle Name | `Middle name` | Text |
| Surname | `Surname` | Text |
| Friendly Salutation | `Friendly salutation` | Text |
| Gender | `Gender` | Text |
| Marital Status | `Marital status` | Text |
| Date of Birth | `Date of Birth` | Date |
| Date of Death | `Date of Death` | Date |
| Nationality | `Nationality` | Text |
| Country of Residence | `Country of residence` | Text |

---

### 3. Client — Address & Contact

_Source: DB#6_

| Field | Nanotax Column | Type |
|---|---|---|
| Address Line 1 | `Address line 1` | Text |
| Address Line 2 | `Address line 2` | Text |
| Town | `Town` | Text |
| County | `County` | Text |
| Country | `Country` | Text |
| Postcode | `Postcode` | Text |
| Contact Number | `Contact number` | Text |
| Email Address | `Email address` | Text |
| Website | `Website` | Text |

---

### 4. Client — Business

_Source: DB#4_

| Field | Nanotax Column | Type |
|---|---|---|
| Occupation | `Occupation` | Text |
| Business Name | `Business Name` | Text |
| Business Type | `Business type` | Text |
| Usual Year End | `Usual Year End` | Text |
| Anticipated Turnover | `Anticipated Turnover (Trading)` | Numeric |
| Industry Type | `Industry type` | Text |
| Enrolled for MTD VAT | `Enrolled for MTD VAT` | Text |

---

### 5. Client — Company

_Source: DB#5_

| Field | Nanotax Column | Type |
|---|---|---|
| Date of Commencement | `Date of commencement` | Date |
| Date of Cessation | `Date of cessation` | Date |
| Company Type | `Company type` | Text |
| Limited Liability Partnership | `Limited Liability Partnership` | Boolean |
| Country of Incorporation | `Country of incorporation` | Text |
| Date of Incorporation | `Date of incorporation` | Date |
| Trading Status | `Trading status` | Text |
| Is Property Business | `Is property business?` | Boolean |
| Company Authentication Code | `Company authentication code` | Text |
| Confirmation Statement Date | `Confirmation Statement Date` | Date |

---

### 6. Client — Practice & Engagement

_Source: DB#7 (engagement), DB#8 (practice flags)_

| Field | Nanotax Column | Type |
|---|---|---|
| Engagement Status | `Engagement status` | Text |
| Consent Type | `Consent Type` | Text |
| Consent Status | `Consent Status` | Text |
| Method of Consent | `Method of Consent` | Text |
| Date of Consent | `Date of Consent` | Date |
| Date of Latest Engagement | `Date of latest engagement` | Date |
| Date of Client Loss | `Date of client loss` | Date |
| AML Status | `AML status` | Text |
| Bookkeeping Software | `Bookkeeping software` | Text |
| Payment Method | `Payment method` | Text |
| 64-8 Status | `64-8 status` | Text |
| 64-8 Completion Date | `64-8 completion date` | Date |

---

### 7. Tax References & Identifiers

_Source: DB#9_

| Field | Nanotax Column | Type |
|---|---|---|
| UTR (Unique Tax Reference) | `Unique tax reference` | Text |
| PAYE Reference | `PAYE reference` | Text |
| PAYE Accounts Office Reference | `PAYE accounts office reference` | Text |
| National Insurance Number | `National insurance number` | Text |
| Company Registration Number | `Company reg no` | Text |
| Date of Incorporation | `Date of incorporation` | Date |
| Tax Office Code | `Tax office code` / `Tax office` | Text |
| Tax Office Telephone | `Tax office telephone` | Text |
| Tax Office Address Line 1 | `Tax office address line 1` | Text |
| Tax Office Address Line 2 | `Tax office address line 2` | Text |
| Tax Office Town | `Tax office address town` | Text |
| Tax Office County | `Tax office address county` | Text |
| Tax Office Postcode | `Tax office address postcode` | Text |
| Enrolled for MTD Income Tax | `Enrolled for MTD Income Tax (ITSA)` | Boolean |
| Latest Accounts Status | _(derived)_ | Text |
| Latest CT600 Status | _(derived)_ | Text |

---

### 8. VAT

_Source: DB (VAT module)_

| Field | Nanotax Column | Type |
|---|---|---|
| VAT Registration Number | `VAT registration no.` | Text |
| VAT Registration Date | `VAT registration date` | Date |
| VAT De-registration Date | `VAT de-registration date` | Date |
| VAT Period End | `VAT period end` | Text |
| VAT Scheme | `VAT scheme` | Text |
| VAT Flat Rate Scheme | `VAT flat rate scheme` | Text |
| EC Sales List Period | `EC sales list period` | Text |

---

### 9. Compliance & AML

_Source: DB#8 / compliance module_

| Field | Nanotax Column | Type |
|---|---|---|
| AML Status | `AML status` | Text |
| AML Last Check Date | `Last AML check date` | Date |
| P11D Dispensation | `P11D dispensation` | Text |
| Pension Auto-Enrolment Date | `Pension auto-enrolment date` | Date |
| Construction Industry Scheme | `Construction Industry Scheme` | Boolean |
| Individual is PSC (not Director) | `Individual is PSC not director` | Boolean |
| Individual is PSC (and Director) | `Individual is PSC and director` | Boolean |
| VS01 Submission Deadline | `VS01 submission deadline` | Date |

---

### 10. Services & Fees

_Source: DB#9, DB#10, DB#11_

| Service | Flag Field | Fee Field |
|---|---|---|
| Annual Accounts | `Annual accounts ?` | `Annual accounts fee` |
| Tax Return | `Tax return ?` | `Tax return fee` |
| Audit | `Audit ?` | `Audit fee` |
| Bookkeeping | `Bookkeeping ?` | `Bookkeeping fee` |
| VAT Returns | `VAT returns ?` | `VAT returns fee` |
| Payroll | `Payroll ?` | `Payroll fee` |
| Consultancy | `Consultancy ?` | `Consultancy fee` |
| Cashflow | `Cashflow ?` | `Cashflow fee` |
| Management Accounts | `Management accounts ?` | `Management accounts fee` |
| Company Secretarial | `Company secretarial ?` | `Company secretarial fee` |
| Other | — | `Other fee` |
| **Total Fee** | — | `Total fee` |

**Records received dates** (when client books/records arrived):

| Period | Field |
|---|---|
| Annual | `Records received — Annual` |
| Q1 | `Records received — Q1` |
| Q1 Revised | `Records received — Q1 Revised` |
| Q2 | `Records received — Q2` |
| Q3 | `Records received — Q3` |
| Q4 | `Records received — Q4` |

---

### 11. Financial Information (Latest Accounts)

_Source: Financial info module_

**Profit & Loss**

| Field | Type |
|---|---|
| Turnover | Money |
| Gross Profit | Money |
| Operating Profit | Money |
| Other Income | Money |
| Finance Costs | Money |
| Profit for Year | Money |
| Profit Before Tax | Money |
| Dividends | Money |
| Interest Payable | Money |
| Other Interest Receivable | Money |
| Total Income | Money |
| Total Self-Employment Income | Money |
| Total Profit from Self-Employments | Money |
| Average Employees | Numeric |

**Balance Sheet — Assets**

| Field | Type |
|---|---|
| Intangible Assets | Money |
| Tangible Assets | Money |
| Investment Properties | Money |
| Fixed Asset Investments | Money |
| Fixed Assets (total) | Money |
| Stock | Money |
| Debtors (within 1 year) | Money |
| Debtors (after 1 year) | Money |
| Directors Loan Overdrawn (within 1yr) | Money |
| Directors Loan Overdrawn (after 1yr) | Money |
| Cash at Bank | Money |
| Bank Balances | Money |
| Current Assets | Money |

**Balance Sheet — Liabilities & Equity**

| Field | Type |
|---|---|
| Creditors within 1 year | Money |
| Directors Loan Account | Money |
| Bank Loans | Money |
| Net Current Assets | Money |
| Total Assets Less Current Liabilities | Money |
| Creditors after 1 year | Money |
| Provisions | Money |
| Net Assets | Money |
| Profit & Loss Account | Money |
| Shareholders' Funds | Money |
| Capital Account | Money |
| Total Members' Interest | Money |
| Net Assets Attributable to Members | Money |

---

### 12. SA Tax Returns (per year, per type)

_Each client can have multiple SA return records — one per tax year × return type (Personal, Partnership, Trust). 15,264 records currently loaded._

**Status & filing**

| Field | Type |
|---|---|
| Tax Year | Text (e.g. `2024/25`) |
| Return Type | Text (`personal`, `partnership`, `trust`) |
| Return Status | Text |
| Return Filed Successfully | Boolean |
| Return Locked | Boolean |
| Date Filed to HMRC | Date |
| Date Last Saved | Date |
| Date Last Status Change | Date |
| Provisional Fields | Boolean |

**Income flags (what pages are included)**

| Flag |
|---|
| Has Employment |
| Has Self-Employment |
| Has Partnership |
| Has UK Property |
| Has Foreign Pages |
| Has Capital Gains |
| Has Residence & Remittance |
| Has Trusts |
| Has Lloyds |
| Not Resident |
| Furnished Holiday Lettings |
| Rent-a-Room |

**Income amounts**

| Field | Type |
|---|---|
| Total Employment Income | Money |
| Total Self-Employment Income | Money |
| Total Profit from Self-Employments | Money |
| Total Losses from Self-Employments | Money |
| Partnership Profit/Loss | Money |
| Total Profit from Partnerships | Money |
| Total Losses from Partnerships | Money |
| Total UK Property Income | Money |
| Total UK Property Profit | Money |
| FHL Income | Money |
| FHL Profits | Money |
| Total Foreign Income | Money |
| Total Foreign Property Income | Money |
| Total Trust Income | Money |
| Total Capital Gains | Money |
| Total Savings Income | Money |
| State Pensions Total | Money |
| Private Pensions | Money |
| Adjusted Total Income | Money |
| Total Income | Money |
| Total Gross Business Income | Money |
| Total Profit from Businesses | Money |
| Total Losses from Businesses | Money |
| UK Life Policies | Money |
| UK Voided ISAs | Money |
| Foreign Life Policies | Money |

**Tax & payments**

| Field | Type |
|---|---|
| Total Tax Due | Money |
| Class 2 NIC Due | Boolean |
| Has Repayment | Boolean |
| Repayment Amount | Money |
| Gift Aid Payments | Money |
| Has Payments on Account | Boolean |
| POA — This Year Jan | Money |
| POA — This Year Jul | Money |
| POA — Next Year Jan | Money |
| POA — Next Year Jul | Money |
| Child Benefit | Money |

---

### 13. Corporation Tax Returns

_One record per client. 972 records loaded._

**Period**

| Field | Type |
|---|---|
| CT Period Start | Date |
| CT Period End | Date |
| CT Payment Deadline | Date |

**Computation — Income & Losses**

| Field | Type |
|---|---|
| Company Turnover | Money |
| Trading Profits | Money |
| BFWD Trade Loss (pre Apr 2017) | Money |
| Net Trading Profits | Money |
| Income from Property | Money |
| Losses BFWD against Investment Income | Money |
| UK Property Losses | Money |
| Trading Losses Used | Money |
| Losses Carried Back | Boolean |
| Trading Losses BFWD Used | Money |
| Total Deductions & Reliefs | Money |

**Chargeable & Tax**

| Field | Type |
|---|---|
| Profits Chargeable to CT | Money |
| No. Associated Companies | Integer |
| No. Associated Companies FY1/FY2 | Integer |
| Small Profit Rate / Marginal Relief | Boolean |
| Corporation Tax | Money |
| Marginal Relief | Money |
| CT Chargeable | Money |
| Net CT Liability | Money |
| S455 Tax Payable | Money |
| Income Tax Deducted | Money |
| Income Tax Repayable to Company | Money |
| Self Assessment Tax Payable | Money |

**Credits & Outstanding**

| Field | Type |
|---|---|
| R&D Credit | Money |
| Creative Tax Credit | Money |
| Capital Allowances Credit | Money |
| Surplus Credits Payable | Money |
| Corporation Tax Outstanding | Money |
| Corporation Tax Overpaid | Money |
| RDEC Surrendered to Company | Money |
| Tax Already Paid | Money |

**R&D**

| Field | Type |
|---|---|
| R&D Claim by SME | Boolean |
| R&D Claim by Large Company | Boolean |
| R&D Notification Form Submitted | Boolean |
| Additional Information Form Submitted | Boolean |
| SME R&D Expenditure | Money |
| R&D Enhanced Expenditure | Money |
| Creative Expenditure | Money |
| R&D & Creative Enhanced Expenditure | Money |
| R&D Enhanced Expenditure inc Sub-contracted | Money |

**CT600 Supplementary Pages**

CT600A, B, C, D, E, F, G, H, J, K, L, M, N (Boolean — whether each supplementary page was included)

**Status**

| Field | Type |
|---|---|
| Return Filed Successfully | Boolean |
| Return Locked | Boolean |
| Has Repayment | Boolean |
| Claim Affecting Earlier Period | Boolean |
| Northern Ireland Trading | Boolean |
| Liable to Large Company Instalments | Boolean |
| Liable to Very Large Company Instalments | Boolean |
| Within Group Payments Arrangement | Boolean |

---

### 14. Accounts Periods

_One record per client (latest period). 972 records loaded._

| Field | Nanotax Column | Type |
|---|---|---|
| Period Start | `Accounting period start date (Latest)` | Date |
| Period End | `Accounting period end date (Latest)` | Date |
| Accounts Status | `Accounts submission status (Latest)` | Text |
| Period Locked | `Accounting period locked? (Latest)` | Boolean |
| Accounting Standard | `Accounting standard (Latest)` | Text |
| Average Employees | `Average number of employees (Latest)` | Numeric |

---

### 15. Companies House Filings

_Boolean or text flags per Companies House form number._

| Category | Forms |
|---|---|
| Annual Accounts | AA01, AA02, AA03, AA06 |
| Address Changes | AD01, AD03, AD04, AD05 |
| Director / Officer Appointments | AP01, AP02, AP03, AP04 |
| Director Changes | CH01, CH02, CH03, CH04 |
| Confirmation Statement | CS01 |
| Name Changes | NM01, NM02, NM03, NM04 |
| PSC Filings | PSC01, PSC02, PSC04, PSC05, PSC07, PSC08, PSC09 |
| Shares | SH01 |
| Terminations | TM01, TM02 |
| Strike Off | VS01 (with submission deadline date) |

**MTD quarterly submission statuses**

| Period | Fields |
|---|---|
| 2026 | Q1, Q2, Q3, Q4 |
| 2027 | Q1, Q2, Q3, Q4 |

---

### 16. MTD ITSA

| Field | Nanotax Column | Type |
|---|---|---|
| Date of Last Submission (26) | MTD submission | Date |
| Period End of Last Submission (26) | MTD submission | Date |
| Last Submission Successful (26) | MTD submission | Boolean |
| Qualifying Income — Self-Employment | MTD income | Money |
| Qualifying Income — UK Property | MTD income | Money |
| Qualifying Income — Foreign Property | MTD income | Money |
| Total Qualifying Income | MTD income | Money |
| Annualised Income — Self-Employment | MTD income | Money |
| MTD 2026 Qualifying Income — SE | MTD 2026 | Money |
| MTD 2026 Qualifying Income — UK Property | MTD 2026 | Money |
| MTD 2026 Qualifying Income — Foreign Property | MTD 2026 | Money |
| MTD 2026 Total Qualifying Income | MTD 2026 | Money |
| SE Accounting Period Not Aligned | Exemption | Boolean |
| Partnership Basis Period Not Aligned | Exemption | Boolean |

---

## Suggested Practice Workflows

The data you now hold is rich enough to power the following operational workflows. Each one can be built as a filtered view or report in the portal.

---

### WF-01 — AML Review List

**Trigger:** AML Last Check Date is more than 12 months ago, OR AML Status is not "Compliant" / "Verified"

**What to do:** Generate a list of clients due for AML refresh, grouped by Assigned Office. Flag clients with no AML check date at all as highest priority.

**Fields used:** `aml_last_check_date`, `aml_status`, `assigned_office`, `name`, `type`

**Why it matters:** A regulatory requirement. Missing AML checks expose the practice to prosecution.

---

### WF-02 — Engagement Letter & Consent Tracker

**Trigger:** `engagement_status` is not "Engaged", OR `consent_status` is not current, OR `date_of_latest_engagement` is more than 12 months ago

**What to do:** Produce a chase list. Flag clients where `date_of_client_loss` is set (ex-clients) to exclude them automatically.

**Fields used:** `engagement_status`, `consent_status`, `consent_type`, `date_of_latest_engagement`, `date_of_client_loss`

**Why it matters:** Engagements need annual renewal. Outdated letters create liability if a dispute arises.

---

### WF-03 — SA Return Filing Progress

**Trigger:** Tax year = current (2024/25). `return_filed_successfully` is false or null.

**What to do:** Segment by `return_status` (Not started / In progress / Ready to file / Awaiting client / Submitted). Show total tax due so the team can prioritise high-value returns. Flag returns where `date_last_saved` has not moved in 14+ days (stalled).

**Fields used:** `tax_year`, `return_status`, `return_filed_successfully`, `date_filed_to_hmrc`, `date_last_saved`, `total_tax_due`, `has_repayment`, `repayment_amount`

**Why it matters:** Direct visibility of the SA filing pipeline. Stalled returns surface before the 31 January deadline.

---

### WF-04 — CT Payment Deadline Radar

**Trigger:** `ct_payment_deadline` is within the next 90 days AND `return_filed_successfully` is false

**What to do:** Red / amber / green banding by days remaining (≤30 / ≤60 / ≤90). Show `net_ct_liability` and `corporation_tax_outstanding` so the client can be alerted to the amount due.

**Fields used:** `ct_payment_deadline`, `return_filed_successfully`, `net_ct_liability`, `corporation_tax_outstanding`

**Why it matters:** HMRC charges interest from the payment deadline. Early warning prevents surprise bills for clients.

---

### WF-05 — 64-8 Chase List

**Trigger:** `status_64_8` is not "Accepted" / "Active", OR `date_64_8_completion` is null

**What to do:** List all clients without a live 64-8 on file. Exclude archived clients and those with a date of client loss.

**Fields used:** `status_64_8`, `date_64_8_completion`, `archived`, `date_of_client_loss`

**Why it matters:** Without an active 64-8 HMRC will not speak to the agent on the client's behalf.

---

### WF-06 — Confirmation Statement Reminder

**Trigger:** `confirmation_statement_date` is within the next 14 days

**What to do:** Email or task reminder for the company secretarial team. Flag clients where company secretarial is not in scope (`company_secretarial_flag = false`) so the client can be notified directly.

**Fields used:** `confirmation_statement_date`, `company_reg_no`, `company_secretarial_flag`

**Why it matters:** A missed confirmation statement results in Companies House striking the company off.

---

### WF-07 — Records Not Received Chase

**Trigger:** `records_received_annual` (or Q1–Q4) is null, and the period has passed

**What to do:** For annual clients, flag where records haven't arrived by a configurable deadline after the year end (`usual_year_end`). For quarterly clients, flag Q1–Q4 by the quarter-end + 4 weeks.

**Fields used:** `records_received_annual`, `records_received_q1–q4`, `usual_year_end`, `bookkeeping_software`

**Why it matters:** Accounts cannot be prepared without records. Early chasing avoids a bottleneck at filing deadlines.

---

### WF-08 — Accounts Status Dashboard

**Trigger:** `accounts_status` (latest period) is not "Filed" / "Complete"

**What to do:** Kanban-style view by status (Not started / Draft / Review / Approved / Submitted). Filter by `period_end` and `accounting_standard`. Show `average_employees` to gauge complexity.

**Fields used:** `period_start`, `period_end`, `accounts_status`, `period_locked`, `accounting_standard`, `average_employees`

**Why it matters:** Tracks accounts workflow across the whole client base in one view.

---

### WF-09 — MTD ITSA Preparation List

**Trigger:** `enrolled_for_mtd_income_tax` is true OR `total_qualifying_income` ≥ £50,000

**What to do:** Show all clients in scope for MTD ITSA. Flag those where the last quarterly submission was unsuccessful or missing. Show qualifying income bands to identify high-risk clients if they miss a submission.

**Fields used:** `enrolled_for_mtd_income_tax`, `total_qualifying_income_26`, `date_of_last_submission_26`, `last_submission_successful_26`, `se_accounting_period_not_aligned`

**Why it matters:** MTD ITSA goes live April 2026 for clients with income ≥ £50k. The practice needs to be ready client-by-client before the first quarterly deadline.

---

### WF-10 — New Client Onboarding Checklist

**Trigger:** `client_creation_date` within the last 90 days

**What to do:** Score each new client against a checklist of essential fields. Flag missing items:
- ☐ UTR obtained
- ☐ NI Number obtained (individuals)
- ☐ Company Reg No (companies)
- ☐ 64-8 submitted
- ☐ Engagement letter signed (`consent_status` = current)
- ☐ AML check completed
- ☐ Email address on file
- ☐ Service scope set (at least one fee flag = Yes)

**Fields used:** All of the above plus `email`, `type`, `utr`, `ni_number`, `company_reg_no`

**Why it matters:** Prevents clients falling through the gaps in the first 90 days.

---

### WF-11 — VAT Compliance Monitor

**Trigger:** `vat_reg_no` is present AND `enrolled_for_mtd_vat` is not "Yes"

**What to do:** Flag VAT-registered clients not enrolled for MTD VAT — these are non-compliant. Separately, flag clients approaching `vat_de_registration_date` (where set) to check whether de-registration is intentional.

**Fields used:** `vat_reg_no`, `vat_reg_date`, `vat_de_registration_date`, `enrolled_for_mtd_vat`, `vat_scheme`

**Why it matters:** MTD for VAT is mandatory for all VAT-registered businesses. Non-enrolled clients face HMRC penalties.

---

### WF-12 — Fee Review (Underbilling Detection)

**Trigger:** Client has services in scope but `total_fee` = 0 or null, OR client has multiple service flags active but a total fee below a practice-defined threshold

**What to do:** Show clients ordered by total fee descending. Surface those where the fee hasn't been updated since a certain date. Cross-reference financial info (`turnover`, `net_assets`) to identify clients whose complexity has grown beyond their current fee.

**Fields used:** `total_fee`, all `*_flag` + `*_fee` columns, `turnover`, `net_assets` (from financial info)

**Why it matters:** Revenue assurance. Identifies clients who have been under-charged relative to the work being done.

---

### WF-13 — Cessation & Archiving Tidy-Up

**Trigger:** `date_of_cessation` is set but `archived` = false, OR `date_of_client_loss` is more than 6 months ago but `archived` = false

**What to do:** Present a list for partner review before archiving. Check that all outstanding filings (SA return, CT return, accounts) are marked complete first.

**Fields used:** `date_of_cessation`, `date_of_client_loss`, `archived`, `return_filed_successfully` (CT & SA), `accounts_status`

**Why it matters:** Keeps the active client list clean and reduces noise in all other workflows.

---

### WF-14 — Pension Auto-Enrolment Deadline Tracker

**Trigger:** `pension_auto_enrolment_date` is within the next 60 days

**What to do:** Alert the payroll team. Flag whether payroll is in scope (`payroll_flag = true`). If payroll is not in scope, alert the client directly.

**Fields used:** `pension_auto_enrolment_date`, `payroll_flag`, `payroll_fee`

**Why it matters:** Missing the auto-enrolment staging date triggers The Pensions Regulator fines starting from day one.

---

### WF-15 — High-Tax SA Return Repayment Tracker

**Trigger:** `has_repayment` = true AND `return_filed_successfully` = false for current or prior year

**What to do:** Prioritise filing these returns. Show `repayment_amount` so the team can communicate cash-back opportunities to clients — good for client relationships and practice differentiation.

**Fields used:** `has_repayment`, `repayment_amount`, `return_filed_successfully`, `tax_year`

**Why it matters:** Clients with repayments are highly motivated to file. Filing quickly generates goodwill and (for repayment-basis firms) faster collection.

---

_Document generated 14 June 2026 from live ClearBooks database — 972 clients, 15,264 SA returns, 972 CT returns._
