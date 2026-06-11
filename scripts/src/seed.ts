import { db } from "@workspace/db";
import {
  clientsTable,
  tasksTable,
  financialInfoTable,
  taxReferencesTable,
  taxReturnsTable,
  saReturnsTable,
  dropdownOptionsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "../../");

// Excel serial date to ISO date string
function excelDateToISO(serial: number | null): string | null {
  if (!serial || typeof serial !== "number") return null;
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split("T")[0];
}

// Parse numeric value safely
function parseNum(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n.toString();
}

// Parse string safely
function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

async function readExcel(filePath: string) {
  const xlsxMod = await import("xlsx");
  const xlsx = xlsxMod.default ?? xlsxMod;
  const wb = xlsx.readFile(filePath);
  const sheetName = wb.SheetNames[0];
  const raw = xlsx.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null }) as any[];
  // Row 0 = report title, row 1 = column headers, rows 2+ = data
  const headers = raw[1];
  const colKeys = Object.keys(headers);
  const colNames = colKeys.map((k) => String(headers[k]));
  const rows = raw.slice(2);
  return rows.map((row) => {
    const out: Record<string, any> = {};
    colKeys.forEach((k, i) => {
      out[colNames[i]] = row[k];
    });
    return out;
  });
}

async function main() {
  console.log("Seeding database from Excel files...");

  // Clear existing data
  await db.execute(sql`TRUNCATE sa_returns, tax_returns, tax_references, financial_info, tasks, clients RESTART IDENTITY CASCADE`);

  // ---- 1. Clients ----
  const contactRows = await readExcel(
    resolve(ROOT, "attached_assets/All_Clients_Contact_Information_14052026_1112_1778759845794.xlsx")
  );

  const seenCodes = new Set<string>();
  const clientInserts = contactRows
    .filter((r) => r["Client code"] && r["Client name"])
    .map((r) => ({
      code: str(r["Client code"])!,
      name: str(r["Client name"])!,
      type: str(r["Client type"]) ?? "Unknown",
      addressLine1: str(r["Address line 1"]),
      addressLine2: str(r["Address line 2"]),
      town: str(r["Town"]),
      county: str(r["County"]),
      postcode: str(r["Postcode"]),
      contactNumber: str(r["Contact number"]),
      email: str(r["Email address"]),
    }))
    .filter((r) => {
      if (seenCodes.has(r.code)) return false;
      seenCodes.add(r.code);
      return true;
    });

  console.log(`Inserting ${clientInserts.length} clients...`);
  const insertedClients: { id: number; code: string; name: string }[] = [];
  // Insert in batches of 100
  for (let i = 0; i < clientInserts.length; i += 100) {
    const batch = clientInserts.slice(i, i + 100);
    const res = await db
      .insert(clientsTable)
      .values(batch)
      .onConflictDoUpdate({ target: clientsTable.code, set: { name: sql`excluded.name` } })
      .returning({ id: clientsTable.id, code: clientsTable.code, name: clientsTable.name });
    insertedClients.push(...res);
  }

  const clientByCode = new Map(insertedClients.map((c) => [c.code, c]));
  const clientByName = new Map(insertedClients.map((c) => [c.name.toLowerCase(), c]));

  // ---- 2. Tasks ----
  const taskRows = await readExcel(
    resolve(ROOT, "attached_assets/All_Overdue_Tasks_14052026_1111_1778760050951.xlsx")
  );
  const taskInserts = taskRows
    .filter((r) => r["Task name"] && r["Client name"])
    .map((r) => {
      const clientName = str(r["Client name"])!;
      const client = clientByName.get(clientName.toLowerCase());
      return {
        clientId: client?.id ?? null,
        clientName,
        activityType: str(r["Activity Type"]),
        assignedTo: str(r["Assigned to"]),
        taskName: str(r["Task name"])!,
        taskStatus: str(r["Task Status"]) ?? "Planned",
        dueDate: excelDateToISO(r["Due date"]),
      };
    });

  console.log(`Inserting ${taskInserts.length} tasks...`);
  for (let i = 0; i < taskInserts.length; i += 100) {
    const batch = taskInserts.slice(i, i + 100);
    await db.insert(tasksTable).values(batch);
  }

  // ---- 3. Financial Info ----
  const finRows = await readExcel(
    resolve(ROOT, "attached_assets/Financial_information_14052026_1132_1778760063412.xlsx")
  );
  const finInserts = finRows
    .filter((r) => r["Client code"])
    .map((r) => {
      const code = str(r["Client code"])!;
      const client = clientByCode.get(code);
      if (!client) return null;
      return {
        clientId: client.id,
        clientCode: code,
        clientType: str(r["Client type"]),
        turnover: parseNum(r["Turnover (Company, Latest)"]),
        profitBeforeTax: parseNum(r["Profit before tax (Company, Latest)"]),
        totalIncome: parseNum(r["Total income (Personal Tax 26)"]),
        totalSelfEmploymentIncome: parseNum(r["Total Self Employment Income (Personal Tax 26)"]),
        totalProfitFromSelfEmployments: parseNum(r["Total Profit from Self Employments (Personal Tax 26)"]),
        avgEmployees: parseNum(r["Average number of employees (Latest)"]),
      };
    })
    .filter(Boolean) as any[];

  console.log(`Inserting ${finInserts.length} financial info records...`);
  for (let i = 0; i < finInserts.length; i += 100) {
    const batch = finInserts.slice(i, i + 100);
    await db.insert(financialInfoTable).values(batch).onConflictDoNothing();
  }

  // ---- 4. Tax References ----
  const taxRefRows = await readExcel(
    resolve(ROOT, "attached_assets/All_Clients_Tax_Reference_Information_14052026_1112_1778760163296.xlsx")
  );
  const taxRefInserts = taxRefRows
    .filter((r) => r["Client name"])
    .map((r) => {
      const clientName = str(r["Client name"])!;
      const client = clientByName.get(clientName.toLowerCase());
      if (!client) return null;
      return {
        clientId: client.id,
        clientName,
        utr: str(r["Unique tax reference"] !== null ? String(r["Unique tax reference"]) : null),
        payeRef: str(r["PAYE reference"]),
        payeAccountsOfficeRef: str(r["PAYE accounts office reference"]),
        vatRegNo: str(r["VAT registration no."]),
        vatRegDate: excelDateToISO(r["VAT registration date"]) ?? str(r["VAT registration date"]),
        taxOffice: str(r["Tax office"]),
        niNumber: str(r["National insurance number"]),
        companyRegNo: str(r["Company registration number"] !== null ? String(r["Company registration number"]) : null),
        dateOfIncorporation: excelDateToISO(r["Date of incorporation"]) ?? str(r["Date of incorporation"]),
        amlStatus: str(r["AML status"]),
        latestAccountsStatus: str(r["Latest Accounts status"]),
        engagementStatus: str(r["Engagement status"]),
      };
    })
    .filter(Boolean) as any[];

  console.log(`Inserting ${taxRefInserts.length} tax reference records...`);
  for (let i = 0; i < taxRefInserts.length; i += 100) {
    const batch = taxRefInserts.slice(i, i + 100);
    await db.insert(taxReferencesTable).values(batch).onConflictDoNothing();
  }

  // ---- 5. SA Tax Returns ----
  const taxReturnRows = await readExcel(
    resolve(ROOT, "attached_assets/Current_SA_Tax_Return_work_status_14052026_1113_1778760223350.xlsx")
  );
  const taxReturnInserts = taxReturnRows
    .filter((r) => r["Client name"])
    .map((r) => {
      const code = str(r["Client code"]);
      const clientName = str(r["Client name"])!;
      const client = code ? clientByCode.get(code) : clientByName.get(clientName.toLowerCase());
      return {
        clientId: client?.id ?? null,
        clientCode: code,
        clientName,
        clientType: str(r["Client type"]),
        taxReturnStatus: str(r["Tax return status"]),
      };
    });

  console.log(`Inserting ${taxReturnInserts.length} tax return records...`);
  for (let i = 0; i < taxReturnInserts.length; i += 100) {
    const batch = taxReturnInserts.slice(i, i + 100);
    await db.insert(taxReturnsTable).values(batch).onConflictDoNothing();
  }

  // ---- 6. SA Returns (bootstrap from same Excel — tax year 2024/25) ----
  const saReturnInserts = taxReturnRows
    .filter((r) => r["Client name"])
    .map((r) => {
      const code = str(r["Client code"]);
      const clientName = str(r["Client name"])!;
      const client = code ? clientByCode.get(code) : clientByName.get(clientName.toLowerCase());
      if (!client) return null;
      return {
        clientId: client.id,
        clientCode: code,
        taxYear: "2024",
        returnType: "personal" as const,
        returnStatus: str(r["Tax return status"]),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  console.log(`Inserting ${saReturnInserts.length} SA return records...`);
  for (let i = 0; i < saReturnInserts.length; i += 100) {
    const batch = saReturnInserts.slice(i, i + 100);
    await db.insert(saReturnsTable).values(batch).onConflictDoNothing();
  }

  // ---- 7. SA Return Status dropdown options (derived from actual data) ----
  const distinctStatuses = [...new Set(
    taxReturnInserts.map((r) => r.taxReturnStatus).filter((s): s is string => !!s)
  )].sort();
  if (distinctStatuses.length > 0) {
    await db.insert(dropdownOptionsTable)
      .values(distinctStatuses.map((value) => ({ category: "sa_return_status", value })))
      .onConflictDoNothing();
    console.log(`Inserted ${distinctStatuses.length} SA return status options`);
  }

  console.log("Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
