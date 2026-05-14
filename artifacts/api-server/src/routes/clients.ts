import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable } from "@workspace/db";
import { eq, ilike, or, and, count, sql } from "drizzle-orm";
import {
  ListClientsQueryParams,
  CreateClientBody,
  UpdateClientParams,
  UpdateClientBody,
  DeleteClientParams,
  GetClientParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const parsed = ListClientsQueryParams.safeParse(req.query);
    const { search, type, engagementStatus, page = 1, limit = 50 } = parsed.success ? parsed.data : ({} as any);

    const pageNum = Number(page) || 1;
    const limitNum = Math.min(Number(limit) || 50, 200);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(clientsTable.name, `%${search}%`),
          ilike(clientsTable.code, `%${search}%`),
          ilike(clientsTable.email, `%${search}%`),
          ilike(clientsTable.town, `%${search}%`)
        )
      );
    }
    if (type) {
      conditions.push(ilike(clientsTable.type, `%${type}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [clients, totalResult] = await Promise.all([
      db.select().from(clientsTable).where(where).limit(limitNum).offset(offset).orderBy(clientsTable.name),
      db.select({ count: count() }).from(clientsTable).where(where),
    ]);

    res.json({
      clients,
      total: Number(totalResult[0]?.count ?? 0),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list clients");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreateClientBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }
    const [client] = await db.insert(clientsTable).values(parsed.data).returning();
    res.status(201).json(client);
  } catch (err) {
    req.log.error({ err }, "Failed to create client");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = GetClientParams.parse({ id: Number(req.params.id) });
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, id));
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const { tasksTable } = await import("@workspace/db");
    const { financialInfoTable } = await import("@workspace/db");
    const { taxReferencesTable } = await import("@workspace/db");
    const { taxReturnsTable } = await import("@workspace/db");

    const [tasks, [financialInfo], [taxReference], [taxReturn]] = await Promise.all([
      db.select().from(tasksTable).where(eq(tasksTable.clientId, id)).orderBy(tasksTable.dueDate),
      db.select().from(financialInfoTable).where(eq(financialInfoTable.clientId, id)),
      db.select().from(taxReferencesTable).where(eq(taxReferencesTable.clientId, id)),
      db.select().from(taxReturnsTable).where(eq(taxReturnsTable.clientId, id)),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const tasksWithOverdue = tasks.map((t) => ({
      ...t,
      isOverdue: t.dueDate ? t.dueDate < today && t.taskStatus !== "Complete" : false,
    }));

    res.json({
      client,
      tasks: tasksWithOverdue,
      financialInfo: financialInfo ?? null,
      taxReference: taxReference ?? null,
      taxReturn: taxReturn ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get client");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = UpdateClientParams.parse({ id: Number(req.params.id) });
    const parsed = UpdateClientBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }
    const [client] = await db
      .update(clientsTable)
      .set(parsed.data)
      .where(eq(clientsTable.id, id))
      .returning();
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json(client);
  } catch (err) {
    req.log.error({ err }, "Failed to update client");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = DeleteClientParams.parse({ id: Number(req.params.id) });
    await db.delete(clientsTable).where(eq(clientsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete client");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
