import { Router } from "express";
import multer from "multer";
import { db, clientsTable, driveSettingsTable, driveFolderTemplateTable } from "@workspace/db";
import { eq, inArray, isNull, isNotNull } from "drizzle-orm";
import {
  testConnection,
  getOrCreateRootFolder,
  createFolder,
  listFilesInFolder,
  listFoldersInFolder,
  searchFilesInFolder,
  uploadFileAsUser,
  deleteFileAsUser,
  getRecentFiles,
  getOAuthUrl,
  exchangeCodeForTokens,
} from "../lib/drive";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── helpers ────────────────────────────────────────────────────────────────

async function getSettings() {
  const rows = await db.select().from(driveSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  // Auto-create default row
  const [row] = await db.insert(driveSettingsTable).values({}).returning();
  return row;
}

interface TemplateNode {
  id: number;
  parentId: number | null;
  name: string;
  sortOrder: number;
  children: TemplateNode[];
}

async function getTemplateTree(): Promise<TemplateNode[]> {
  const flat = await db
    .select()
    .from(driveFolderTemplateTable)
    .orderBy(driveFolderTemplateTable.sortOrder, driveFolderTemplateTable.name);

  const map = new Map<number, TemplateNode>();
  for (const n of flat) {
    map.set(n.id, { ...n, children: [] });
  }
  const roots: TemplateNode[] = [];
  for (const n of flat) {
    const node = map.get(n.id)!;
    if (n.parentId && map.has(n.parentId)) {
      map.get(n.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

async function getAllDescendantIds(id: number): Promise<number[]> {
  const all = await db.select({ id: driveFolderTemplateTable.id, parentId: driveFolderTemplateTable.parentId }).from(driveFolderTemplateTable);
  const result: number[] = [];
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    result.push(cur);
    for (const n of all) {
      if (n.parentId === cur) queue.push(n.id);
    }
  }
  return result;
}

async function stampFolderTree(
  nodes: TemplateNode[],
  parentDriveFolderId: string
): Promise<void> {
  for (const node of nodes) {
    const folderId = await createFolder(node.name, parentDriveFolderId);
    if (node.children.length > 0) {
      await stampFolderTree(node.children, folderId);
    }
  }
}

// ─── routes ─────────────────────────────────────────────────────────────────

router.get("/drive/status", async (req, res): Promise<void> => {
  try {
    const settings = await getSettings();
    const result = await testConnection();
    res.json({
      connected: result.ok,
      email: result.email ?? null,
      error: result.error ?? null,
      rootFolderName: settings.rootFolderName,
      rootFolderId: settings.rootFolderId ?? null,
      oauthConnected: !!settings.oauthRefreshToken,
      oauthEmail: settings.oauthEmail ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get drive status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── OAuth2 endpoints ────────────────────────────────────────────────────────

router.get("/drive/oauth/url", async (req, res): Promise<void> => {
  try {
    const url = getOAuthUrl();
    res.json({ url });
  } catch (err: any) {
    req.log.error({ err }, "Failed to generate OAuth URL");
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.get("/drive/oauth/callback", async (req, res): Promise<void> => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : null;
    if (!code) { res.status(400).send("Missing code parameter"); return; }
    const { refreshToken, email } = await exchangeCodeForTokens(code);
    const settings = await getSettings();
    await db
      .update(driveSettingsTable)
      .set({ oauthRefreshToken: refreshToken, oauthEmail: email })
      .where(eq(driveSettingsTable.id, settings.id));
    res.redirect("/admin?tab=drive&oauth=success");
  } catch (err: any) {
    req.log.error({ err }, "OAuth callback failed");
    res.redirect(`/admin?tab=drive&oauth=error&msg=${encodeURIComponent(err?.message ?? "Unknown error")}`);
  }
});

router.delete("/drive/oauth/disconnect", async (req, res): Promise<void> => {
  try {
    const settings = await getSettings();
    await db
      .update(driveSettingsTable)
      .set({ oauthRefreshToken: null, oauthEmail: null })
      .where(eq(driveSettingsTable.id, settings.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to disconnect OAuth");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/drive/settings", async (req, res): Promise<void> => {
  try {
    const { rootFolderName } = req.body as { rootFolderName?: string };
    const settings = await getSettings();
    const updates: Partial<typeof settings> = {};
    if (rootFolderName) updates.rootFolderName = String(rootFolderName);
    const [updated] = await db
      .update(driveSettingsTable)
      .set(updates)
      .where(eq(driveSettingsTable.id, settings.id))
      .returning();
    const result = await testConnection();
    res.json({
      connected: result.ok,
      email: result.email ?? null,
      error: result.error ?? null,
      rootFolderName: updated.rootFolderName,
      rootFolderId: updated.rootFolderId ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update drive settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/drive/template", async (req, res): Promise<void> => {
  try {
    const nodes = await getTemplateTree();
    res.json({ nodes });
  } catch (err) {
    req.log.error({ err }, "Failed to get template");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/drive/template", async (req, res): Promise<void> => {
  try {
    const { name, parentId, sortOrder } = req.body as { name?: string; parentId?: number | null; sortOrder?: number };
    if (!name?.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    const [node] = await db
      .insert(driveFolderTemplateTable)
      .values({ name: name.trim(), parentId: parentId ?? null, sortOrder: sortOrder ?? 0 })
      .returning();
    res.status(201).json({ ...node, children: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to create template node");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/drive/template/:id", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const { name, sortOrder, parentId } = req.body as { name?: string; sortOrder?: number; parentId?: number | null };
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder);
    if (parentId !== undefined) updates.parentId = parentId ?? null;
    const [node] = await db
      .update(driveFolderTemplateTable)
      .set(updates)
      .where(eq(driveFolderTemplateTable.id, id))
      .returning();
    if (!node) { res.status(404).json({ error: "Node not found" }); return; }
    res.json({ ...node, children: [] });
  } catch (err) {
    req.log.error({ err }, "Failed to update template node");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/drive/template/:id", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    const ids = await getAllDescendantIds(id);
    await db.delete(driveFolderTemplateTable).where(inArray(driveFolderTemplateTable.id, ids));
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err }, "Failed to delete template node");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/drive/provision-stats", async (req, res): Promise<void> => {
  try {
    const all = await db.select({ id: clientsTable.id, driveFolderId: clientsTable.driveFolderId }).from(clientsTable);
    const total = all.length;
    const provisioned = all.filter((c) => c.driveFolderId).length;
    res.json({ total, provisioned, unprovisioned: total - provisioned });
  } catch (err) {
    req.log.error({ err }, "Failed to get provision stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/drive/clients/:clientId/provision", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    const clientId = parseInt(raw, 10);
    const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, clientId));
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }

    const settings = await getSettings();
    const rootFolderId = await getOrCreateRootFolder(settings.rootFolderName);
    if (settings.rootFolderId !== rootFolderId) {
      await db.update(driveSettingsTable).set({ rootFolderId }).where(eq(driveSettingsTable.id, settings.id));
    }

    const folderName = `${client.code} - ${client.name}`;
    const clientFolderId = await createFolder(folderName, rootFolderId);

    const tree = await getTemplateTree();
    await stampFolderTree(tree, clientFolderId);

    await db.update(clientsTable).set({ driveFolderId: clientFolderId }).where(eq(clientsTable.id, clientId));

    res.json({ folderId: clientFolderId, clientId });
  } catch (err: any) {
    req.log.error({ err }, "Failed to provision client drive folder");
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.post("/drive/provision-all", async (req, res): Promise<void> => {
  try {
    const unprovisioned = await db
      .select({ id: clientsTable.id, name: clientsTable.name, code: clientsTable.code })
      .from(clientsTable)
      .where(isNull(clientsTable.driveFolderId));

    const settings = await getSettings();
    const rootFolderId = await getOrCreateRootFolder(settings.rootFolderName);
    if (settings.rootFolderId !== rootFolderId) {
      await db.update(driveSettingsTable).set({ rootFolderId }).where(eq(driveSettingsTable.id, settings.id));
    }
    const tree = await getTemplateTree();

    let provisioned = 0;
    let failed = 0;
    for (const client of unprovisioned) {
      try {
        const folderName = `${client.code} - ${client.name}`;
        const clientFolderId = await createFolder(folderName, rootFolderId);
        await stampFolderTree(tree, clientFolderId);
        await db.update(clientsTable).set({ driveFolderId: clientFolderId }).where(eq(clientsTable.id, client.id));
        provisioned++;
      } catch (err) {
        logger.warn({ err, clientId: client.id }, "Failed to provision client folder");
        failed++;
      }
    }
    res.json({ provisioned, skipped: 0, failed });
  } catch (err: any) {
    req.log.error({ err }, "Failed to provision all client folders");
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.get("/drive/clients/:clientId/files", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    const clientId = parseInt(raw, 10);
    const [client] = await db.select({ driveFolderId: clientsTable.driveFolderId }).from(clientsTable).where(eq(clientsTable.id, clientId));
    if (!client) { res.status(404).json({ error: "Client not found" }); return; }
    if (!client.driveFolderId) {
      res.json({ folders: [], recentFiles: [], clientFolderId: null });
      return;
    }

    // Build two-level folder tree first so we have all folder IDs for the files query
    const subFolders = await listFoldersInFolder(client.driveFolderId);
    const folders = await Promise.all(
      subFolders.map(async (f) => {
        const children = await listFoldersInFolder(f.id);
        return {
          id: f.id,
          name: f.name,
          webViewLink: f.webViewLink ?? null,
          children: children.map((c) => ({ id: c.id, name: c.name, webViewLink: c.webViewLink ?? null, children: [] })),
        };
      })
    );

    // Collect all folder IDs (root + level-1 + level-2) for recursive file listing
    const allFolderIds = [
      client.driveFolderId,
      ...subFolders.map(f => f.id),
      ...folders.flatMap(f => f.children.map(c => c.id)),
    ];
    const recentFiles = await getRecentFiles(allFolderIds, 20);

    res.setHeader("Cache-Control", "no-store");
    res.json({ folders, recentFiles, clientFolderId: client.driveFolderId });
  } catch (err: any) {
    req.log.error({ err }, "Failed to get client drive files");
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.get("/drive/clients/:clientId/search", async (req, res): Promise<void> => {
  try {
    const raw = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    const clientId = parseInt(raw, 10);
    const q = String(req.query["q"] ?? "").trim();
    if (!q) { res.json({ files: [] }); return; }

    const [client] = await db.select({ driveFolderId: clientsTable.driveFolderId }).from(clientsTable).where(eq(clientsTable.id, clientId));
    if (!client?.driveFolderId) { res.json({ files: [] }); return; }

    const files = await searchFilesInFolder(client.driveFolderId, q);
    res.json({ files });
  } catch (err: any) {
    req.log.error({ err }, "Failed to search client drive files");
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.post("/drive/clients/:clientId/upload/:folderId", upload.single("file"), async (req, res): Promise<void> => {
  try {
    const rawClientId = Array.isArray(req.params.clientId) ? req.params.clientId[0] : req.params.clientId;
    const clientId = parseInt(rawClientId, 10);
    const folderId = Array.isArray(req.params.folderId) ? req.params.folderId[0] : req.params.folderId;

    if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
    const [client] = await db.select({ driveFolderId: clientsTable.driveFolderId }).from(clientsTable).where(eq(clientsTable.id, clientId));
    if (!client?.driveFolderId) { res.status(404).json({ error: "Client has no Drive folder" }); return; }

    const settings = await getSettings();
    if (!settings.oauthRefreshToken) {
      res.status(403).json({ error: "No Google Account connected for uploads. Go to Admin → Drive Folders → connect your Google Account to enable uploads." });
      return;
    }

    const uploaded = await uploadFileAsUser(settings.oauthRefreshToken, folderId, req.file.originalname, req.file.mimetype, req.file.buffer);
    res.status(201).json({ file: uploaded });
  } catch (err: any) {
    req.log.error({ err }, "Failed to upload file to drive");
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

router.delete("/drive/files/:fileId", async (req, res): Promise<void> => {
  try {
    const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
    const settings = await getSettings();
    if (!settings.oauthRefreshToken) {
      res.status(403).json({ error: "No Google Account connected. Go to Admin → Drive Folders to connect." });
      return;
    }
    await deleteFileAsUser(settings.oauthRefreshToken, fileId);
    res.status(204).end();
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete drive file");
    res.status(500).json({ error: err?.message ?? "Internal server error" });
  }
});

export default router;
