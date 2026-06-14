---
name: Nanotax ZIP import quirks
description: Three bugs found and fixed in the taxcalc-parser/importer when handling Nanotax report ZIPs
---

## Bug 1 — DEFLATE compression not decompressed
`extractZipEntries` in `taxcalc-parser.ts` read raw compressed bytes without checking or decompressing. TaxCalc-native ZIPs use STORE (method 0) so they worked; user-created or Nanotax-exported ZIPs use DEFLATE (method 8) and silently produced garbage data. Fix: read compression method from central dir offset +10, call `zlib.inflateRawSync` when method === 8.

**Why:** The custom ZIP extractor pre-dates production use of Nanotax report exports. TaxCalc native exports happen to use STORE compression.

## Bug 2 — Header rows skipped in Nanotax report files
All Nanotax report XLS files prepend 2 metadata rows (row 1: "Printed: date/time", row 2: report title) before the real column headers on row 3. `parseXls` used `sheet_to_json` with no offset so row 1 became the column name. Fix: scan rows to find the one containing cell value `"Client code"` exactly, pass that index as `range` to `sheet_to_json`.

**Why:** TaxCalc-native DB# files (in the full export ZIP) have headers on row 1; Nanotax standalone report exports always have 2 preamble rows. Both share DB#N filenames so the same parser handles both.

## Bug 3 — Partial imports overwrote existing data with null/"Unknown"
`makeExcludedSet` built `SET col = excluded.col` for all columns. Importing only DB3+DB4 (no DB6/DB7/DB11 etc.) meant `cr.email`, `cr.type` etc. were null/"Unknown" → upsert wiped real data. Fixes:
- `makeExcludedSet` now uses `COALESCE(excluded.col, table.col)` — null incoming values preserve existing data.
- `type` column additionally uses `COALESCE(NULLIF(excluded.type, 'Unknown'), clients.type)` because the importer defaults to the non-null sentinel `"Unknown"` when DB11 is absent, which COALESCE alone cannot distinguish from a real value.

**How to apply:** Any future columns that use a non-null sentinel instead of null for "not provided" need the same NULLIF treatment.

## DB file mapping (key files)
- DB3: personal (forename, surname, gender, DOB, nationality)
- DB4: business (occupation, businessName, businessType, tradingStatus)
- DB6: contact (address, email, phone)
- DB7: engagement/consent (engagementStatus, consentStatus)
- DB11: client list with type and name — reads **positionally** (row[0]) not by column name, so header rows don't affect it
- DB22-33: financial info
- DB44-53: SA return personal tax data
