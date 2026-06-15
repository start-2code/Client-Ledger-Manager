import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Folder, FolderOpen, File, ExternalLink, Upload, Search, Loader2, X,
  HardDrive, FolderPlus, ChevronRight, ChevronDown, FileText,
} from "lucide-react";
import {
  useGetDriveClientFiles,
  useUploadDriveFile,
  useDriveProvisionClient,
  useGetDriveStatus,
  getGetDriveClientFilesQueryKey,
} from "@workspace/api-client-react";
import type { DriveFile, DriveFolder } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

function mimeIcon(mimeType: string): string {
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv")) return "📊";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📊";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("zip") || mimeType.includes("archive")) return "📦";
  if (mimeType.includes("folder")) return "📁";
  return "📎";
}

function formatSize(size: string | null | undefined): string {
  if (!size) return "";
  const bytes = parseInt(size, 10);
  if (isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FolderNodeProps {
  folder: DriveFolder;
  clientId: number;
  depth: number;
  onRefresh: () => void;
}

function FolderNode({ folder, clientId, depth, onRefresh }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDriveFile();
  const qc = useQueryClient();

  const hasChildren = folder.children && folder.children.length > 0;

  const handleUpload = async (file: File) => {
    if (!folder.id) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await upload.mutateAsync({ clientId, folderId: folder.id, data: { file: file as any } });
      qc.invalidateQueries({ queryKey: getGetDriveClientFilesQueryKey(clientId) });
      onRefresh();
      toast.success(`Uploaded "${file.name}"`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-muted/50 group cursor-pointer"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-muted-foreground">
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="w-3.5 inline-block" />
          )}
        </span>
        {expanded ? <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" /> : <Folder className="h-4 w-4 text-amber-400 shrink-0" />}
        <span className="text-sm flex-1 truncate">{folder.name}</span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
          {folder.id && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                title="Upload file here"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              </Button>
              {folder.webViewLink && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  title="Open in Drive"
                  asChild
                >
                  <a href={folder.webViewLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {folder.children!.map((child) => (
            <FolderNode key={child.id ?? child.name} folder={child} clientId={clientId} depth={depth + 1} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  clientId: number;
  clientName: string;
}

export function DriveDocumentsTab({ clientId, clientName }: Props) {
  const qc = useQueryClient();
  const { data: statusData } = useGetDriveStatus({ query: { refetchInterval: false } } as any);
  const { data, isLoading, refetch } = useGetDriveClientFiles(clientId);
  const provision = useDriveProvisionClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DriveFile[] | null>(null);
  const [provisioning, setProvisioning] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/drive/clients/${clientId}/search?q=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      setSearchResults(json.files ?? []);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleProvision = async () => {
    setProvisioning(true);
    try {
      await provision.mutateAsync({ clientId });
      await qc.invalidateQueries({ queryKey: getGetDriveClientFilesQueryKey(clientId) });
      await refetch();
      toast.success("Drive folder created");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Provisioning failed");
    } finally {
      setProvisioning(false);
    }
  };

  if (!statusData?.connected) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center space-y-2">
        <HardDrive className="h-8 w-8 mx-auto text-muted-foreground/40" />
        <p className="text-sm font-medium">Google Drive not connected</p>
        <p className="text-xs text-muted-foreground">Set up the Drive connection in Admin → Drive Folders</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Drive files…
      </div>
    );
  }

  if (!data?.clientFolderId) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center space-y-3">
        <FolderPlus className="h-8 w-8 mx-auto text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium">No Drive folder for this client</p>
          <p className="text-xs text-muted-foreground mt-1">Create a folder to start filing documents</p>
        </div>
        <Button onClick={handleProvision} disabled={provisioning}>
          {provisioning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FolderPlus className="h-4 w-4 mr-2" />}
          Create Drive Folder
        </Button>
      </div>
    );
  }

  const folders = data.folders ?? [];
  const recentFiles = data.recentFiles ?? [];

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="Search files in this client's Drive…"
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()} variant="outline">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
        {searchResults !== null && (
          <Button variant="ghost" size="icon" onClick={() => { setSearchResults(null); setSearchQuery(""); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search results */}
      {searchResults !== null && (
        <div>
          <p className="text-sm font-medium mb-2">{searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"</p>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files found</p>
          ) : (
            <div className="rounded-md border divide-y">
              {searchResults.map((f) => (
                <FileRow key={f.id} file={f} />
              ))}
            </div>
          )}
        </div>
      )}

      {searchResults === null && (
        <>
          {/* Folder tree */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Folders</h3>
              {data.clientFolderId && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={`https://drive.google.com/drive/folders/${data.clientFolderId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Open root in Drive
                  </a>
                </Button>
              )}
            </div>
            {folders.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No subfolders — the folder was provisioned without a template.
              </div>
            ) : (
              <div className="rounded-md border bg-background">
                {folders.map((folder) => (
                  <FolderNode
                    key={folder.id ?? folder.name}
                    folder={folder}
                    clientId={clientId}
                    depth={0}
                    onRefresh={() => qc.invalidateQueries({ queryKey: getGetDriveClientFilesQueryKey(clientId) })}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Recent files */}
          <div>
            <h3 className="text-sm font-medium mb-2">Recent files</h3>
            {recentFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No files yet — upload directly to a subfolder above.</p>
            ) : (
              <div className="rounded-md border divide-y">
                {recentFiles.map((f) => (
                  <FileRow key={f.id} file={f} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FileRow({ file }: { file: DriveFile }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <span className="text-lg shrink-0">{mimeIcon(file.mimeType)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {file.modifiedTime && <span>{format(new Date(file.modifiedTime), "d MMM yyyy")}</span>}
          {file.size && <span>{formatSize(file.size)}</span>}
        </div>
      </div>
      {file.webViewLink && (
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" asChild>
          <a href={file.webViewLink} target="_blank" rel="noopener noreferrer" title="Open in Drive">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      )}
    </div>
  );
}
