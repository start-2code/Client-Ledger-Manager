import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { db } from "@workspace/db";
import {
  clientsTable,
  tasksTable,
  taxReturnsTable,
  taxReferencesTable,
  financialInfoTable,
} from "@workspace/db";
import { count, sql, sum } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const AiChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const AiChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z.array(AiChatMessageSchema).optional().default([]),
});

async function buildDbContext(): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const [
    clients,
    tasks,
    taxReturns,
    taxRefs,
    financialInfo,
    clientsByType,
    tasksByStatus,
    taxReturnsByStatus,
    overdueCount,
    vatCount,
    turnoverResult,
  ] = await Promise.all([
    db.select({
      id: clientsTable.id,
      code: clientsTable.code,
      name: clientsTable.name,
      type: clientsTable.type,
    }).from(clientsTable).orderBy(clientsTable.name),

    db.select({
      id: tasksTable.id,
      taskName: tasksTable.taskName,
      taskStatus: tasksTable.taskStatus,
      activityType: tasksTable.activityType,
      assignedTo: tasksTable.assignedTo,
      dueDate: tasksTable.dueDate,
      clientId: tasksTable.clientId,
      clientName: tasksTable.clientName,
    }).from(tasksTable).orderBy(tasksTable.dueDate),

    db.select({
      id: taxReturnsTable.id,
      clientId: taxReturnsTable.clientId,
      clientName: taxReturnsTable.clientName,
      clientCode: taxReturnsTable.clientCode,
      taxReturnStatus: taxReturnsTable.taxReturnStatus,
    }).from(taxReturnsTable),

    db.select({
      clientId: taxReferencesTable.clientId,
      utr: taxReferencesTable.utr,
      vatRegNo: taxReferencesTable.vatRegNo,
      engagementStatus: taxReferencesTable.engagementStatus,
      amlStatus: taxReferencesTable.amlStatus,
      latestAccountsStatus: taxReferencesTable.latestAccountsStatus,
    }).from(taxReferencesTable),

    db.select({
      clientId: financialInfoTable.clientId,
      turnover: financialInfoTable.turnover,
      profitBeforeTax: financialInfoTable.profitBeforeTax,
    }).from(financialInfoTable),

    db.select({ type: clientsTable.type, count: count() })
      .from(clientsTable).groupBy(clientsTable.type),

    db.select({ status: tasksTable.taskStatus, count: count() })
      .from(tasksTable).groupBy(tasksTable.taskStatus),

    db.select({ status: taxReturnsTable.taxReturnStatus, count: count() })
      .from(taxReturnsTable).groupBy(taxReturnsTable.taxReturnStatus),

    db.select({ count: count() }).from(tasksTable)
      .where(sql`${tasksTable.dueDate} < ${today} AND ${tasksTable.taskStatus} != 'Complete'`),

    db.select({ count: count() }).from(taxReferencesTable)
      .where(sql`${taxReferencesTable.vatRegNo} IS NOT NULL`),

    db.select({ total: sum(financialInfoTable.turnover) }).from(financialInfoTable),
  ]);

  const taxRefMap = new Map(taxRefs.map((r) => [r.clientId, r]));
  const clientMap = new Map(clients.map((c) => [c.id, c]));

  const lines: string[] = [];

  lines.push("=== PRACTICE SUMMARY ===");
  lines.push(`Total clients: ${clients.length}`);
  lines.push(`Total tasks: ${tasks.length} (overdue: ${overdueCount[0]?.count ?? 0})`);
  lines.push(`Total SA tax returns: ${taxReturns.length}`);
  lines.push(`VAT registered clients: ${vatCount[0]?.count ?? 0}`);
  if (turnoverResult[0]?.total) {
    lines.push(`Combined turnover on record: £${Number(turnoverResult[0].total).toLocaleString()}`);
  }

  lines.push("\n=== CLIENTS BY TYPE ===");
  clientsByType.forEach((r) => lines.push(`  ${r.type ?? "Unknown"}: ${r.count}`));

  lines.push("\n=== TASKS BY STATUS ===");
  tasksByStatus.forEach((r) => lines.push(`  ${r.status ?? "Unknown"}: ${r.count}`));

  lines.push("\n=== SA TAX RETURNS BY STATUS ===");
  taxReturnsByStatus.forEach((r) => lines.push(`  ${r.status ?? "Unknown"}: ${r.count}`));

  lines.push("\n=== ALL CLIENTS ===");
  lines.push("Code | Name | Type | Engagement | AML | Accounts Status | VAT No");
  clients.forEach((c) => {
    const ref = taxRefMap.get(c.id);
    lines.push(
      `${c.code ?? "-"} | ${c.name} | ${c.type ?? "-"} | ${ref?.engagementStatus ?? "-"} | ${ref?.amlStatus ?? "-"} | ${ref?.latestAccountsStatus ?? "-"} | ${ref?.vatRegNo ?? "-"}`
    );
  });

  lines.push("\n=== ALL TASKS ===");
  lines.push("ID | Task | Client | Status | Activity | Assigned To | Due Date");
  tasks.forEach((t) => {
    lines.push(
      `${t.id} | ${t.taskName} | ${t.clientName ?? "-"} | ${t.taskStatus} | ${t.activityType ?? "-"} | ${t.assignedTo ?? "-"} | ${t.dueDate ?? "-"}`
    );
  });

  lines.push("\n=== SA TAX RETURNS ===");
  lines.push("Client Code | Client Name | Status");
  taxReturns.forEach((r) => {
    lines.push(`${r.clientCode ?? "-"} | ${r.clientName ?? "-"} | ${r.taxReturnStatus ?? "-"}`);
  });

  lines.push("\n=== FINANCIAL INFO ===");
  lines.push("Client | Turnover | Profit Before Tax");
  financialInfo.forEach((f) => {
    const client = f.clientId ? clientMap.get(f.clientId) : null;
    lines.push(
      `${client?.name ?? "-"} | ${f.turnover != null ? `£${Number(f.turnover).toLocaleString()}` : "-"} | ${f.profitBeforeTax != null ? `£${Number(f.profitBeforeTax).toLocaleString()}` : "-"}`
    );
  });

  return lines.join("\n");
}

router.post("/chat", async (req, res) => {
  const parsed = AiChatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }

  const { message, history } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const dbContext = await buildDbContext();

    const systemInstruction = `You are a helpful AI assistant for an accountant practice using ClearBooks Portal.
You have been given a full snapshot of the practice database below. Use it to answer questions accurately.
Be concise but complete. When listing clients or tasks, format them clearly.
If asked about specific numbers, counts, or names, refer to the data provided.
Today's date is ${new Date().toISOString().split("T")[0]}.

${dbContext}`;

    const genai = new GoogleGenAI({ apiKey });

    const contents = [
      ...history.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const stream = await genai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "AI chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "AI request failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
      res.end();
    }
  }
});

export default router;
