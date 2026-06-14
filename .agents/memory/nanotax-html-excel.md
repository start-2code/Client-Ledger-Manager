---
name: Nanotax HTML-as-Excel parsing
description: Nanotax ZIP DB files are HTML tables with .xlsx extension; self-closing <td/> causes SheetJS to skip blank cells and shift values left.
---

## The rule
Always pre-process Nanotax DB files before passing to SheetJS: expand self-closing `<td/>` tags to `<td></td>`.

**Why:** Nanotax exports all DB#N files as HTML `<table>` documents saved with an `.xlsx` extension. Empty cells are written as `<td class="string"/>` (self-closing). SheetJS silently skips self-closing `<td/>` tags when parsing HTML, so every value after a blank column is placed one position too far left in the row array — causing completely wrong column-to-field mappings.

**How to apply:** `parseXls()` in `taxcalc-parser.ts` already implements this fix. Check the first 20 bytes of the buffer; if it starts with `<!` or `<h`/`<H`, run `.replace(/<td([^>]*)\/>/gi, "<td$1></td>")` on the full string before calling `XLSX.read()`. This applies to every DB file (3–21, financial, CT, etc.) — not just DB6.
