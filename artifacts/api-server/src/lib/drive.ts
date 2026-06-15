import { google } from "googleapis";
import { logger } from "./logger";

function getAuth() {
  const keyJson = process.env["GOOGLE_SERVICE_ACCOUNT_KEY"];
  if (!keyJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set");
  }
  let key: any;
  try {
    key = JSON.parse(keyJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return auth;
}

export function getDriveClient() {
  const auth = getAuth();
  return google.drive({ version: "v3", auth });
}

export async function testConnection(): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const auth = getAuth();
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

export async function getOrCreateRootFolder(rootFolderName: string): Promise<string> {
  const drive = getDriveClient();
  const search = await drive.files.list({
    q: `name='${rootFolderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    spaces: "drive",
  });
  const existing = search.data.files?.[0];
  if (existing?.id) return existing.id;

  const created = await drive.files.create({
    requestBody: {
      name: rootFolderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
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
  });
  return (res.data.files ?? []) as DriveFile[];
}

export async function uploadFile(
  folderId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<DriveFile> {
  const drive = getDriveClient();
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
  });
  return res.data as DriveFile;
}

export async function getRecentFiles(rootFolderId: string, maxResults = 20): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${rootFolderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name,mimeType,size,modifiedTime,webViewLink,parents)",
    orderBy: "modifiedTime desc",
    pageSize: maxResults,
    includeItemsFromAllDrives: false,
  });
  return (res.data.files ?? []) as DriveFile[];
}
