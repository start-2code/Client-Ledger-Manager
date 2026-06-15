import { google } from "googleapis";
import { logger } from "./logger";

// ─── Service Account helpers ─────────────────────────────────────────────────

function getServiceAccountKey(): any {
  const keyJson = process.env["GOOGLE_SERVICE_ACCOUNT_KEY"];
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set");
  try {
    return JSON.parse(keyJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON");
  }
}

function getServiceAccountAuth() {
  const key = getServiceAccountKey();
  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

export function getDriveClient() {
  const auth = getServiceAccountAuth();
  return google.drive({ version: "v3", auth });
}

export async function testConnection(): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const auth = getServiceAccountAuth();
    const client = await auth.getClient();
    const tokenInfo = await (client as any).getAccessToken();
    if (!tokenInfo?.token) throw new Error("No access token returned");
    const drive = google.drive({ version: "v3", auth });
    const about = await drive.about.get({ fields: "user" });
    return { ok: true, email: about.data.user?.emailAddress ?? undefined };
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Drive connection test failed");
    return { ok: false, error: err?.message ?? "Unknown error" };
  }
}

// ─── OAuth2 helpers ───────────────────────────────────────────────────────────

function getOAuth2Client() {
  const clientId = process.env["GOOGLE_OAUTH_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_OAUTH_CLIENT_SECRET"];
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set");
  }
  const domain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0].trim();
  const redirectUri = `https://${domain}/api/drive/oauth/callback`;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getOAuthUrl(): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive"],
  });
}

export async function exchangeCodeForTokens(code: string): Promise<{ refreshToken: string; email: string }> {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) throw new Error("No refresh token returned — try disconnecting and reconnecting");

  // Fetch userinfo directly with the access token to avoid googleapis wrapper auth issues
  let email = "unknown";
  if (tokens.access_token) {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (res.ok) {
        const info = await res.json() as { email?: string };
        email = info.email ?? "unknown";
      }
    } catch {
      // email stays as "unknown" — not fatal
    }
  }

  return { refreshToken: tokens.refresh_token, email };
}

function getDriveClientFromToken(refreshToken: string) {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2 });
}

// ─── Folder management (service account) ─────────────────────────────────────

export async function getOrCreateRootFolder(rootFolderName: string): Promise<string> {
  const drive = getDriveClient();
  const search = await drive.files.list({
    q: `name='${rootFolderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    spaces: "drive",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  const existing = search.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name: rootFolderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
    supportsAllDrives: true,
  });
  return created.data.id!;
}

export async function createFolder(name: string, parentId: string): Promise<string> {
  const drive = getDriveClient();
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  return res.data.id!;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
}

export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink,parents)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  return (res.data.files ?? []) as DriveFile[];
}

export async function listFoldersInFolder(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name,mimeType,webViewLink,parents)",
    orderBy: "name",
    pageSize: 100,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  return (res.data.files ?? []) as DriveFile[];
}

export async function searchFilesInFolder(rootFolderId: string, query: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const escaped = query.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${rootFolderId}' in parents and fullText contains '${escaped}' and trashed=false`,
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink,parents)",
    orderBy: "modifiedTime desc",
    pageSize: 30,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  return (res.data.files ?? []) as DriveFile[];
}

// ─── File upload (user OAuth token) ──────────────────────────────────────────

export async function deleteFolder(folderId: string): Promise<void> {
  const drive = getDriveClient();
  // Verify it's empty first
  const contents = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id)",
    pageSize: 1,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  if ((contents.data.files ?? []).length > 0) {
    throw Object.assign(new Error("Folder is not empty"), { code: "NOT_EMPTY" });
  }
  await drive.files.delete({ fileId: folderId, supportsAllDrives: true });
}

export async function deleteFileAsUser(refreshToken: string, fileId: string): Promise<void> {
  const drive = getDriveClientFromToken(refreshToken);
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

export async function uploadFileAsUser(
  refreshToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<DriveFile> {
  const drive = getDriveClientFromToken(refreshToken);
  const { Readable } = await import("stream");
  const stream = Readable.from(buffer);
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id,name,mimeType,size,modifiedTime,webViewLink",
    supportsAllDrives: true,
  });
  return res.data as DriveFile;
}

export async function getRecentFiles(folderIds: string[], maxResults = 20): Promise<DriveFile[]> {
  if (folderIds.length === 0) return [];
  const drive = getDriveClient();
  // Build an OR query across all known folder IDs (Drive doesn't support 'in ancestors')
  const parentsClauses = folderIds.map(id => `'${id}' in parents`).join(" or ");
  const res = await drive.files.list({
    q: `(${parentsClauses}) and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink,parents)",
    orderBy: "modifiedTime desc",
    pageSize: maxResults,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  return (res.data.files ?? []) as DriveFile[];
}
