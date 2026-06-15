import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, Loader2, HardDrive, FolderTree, Settings, Users, Zap,
} from "lucide-react";
import {
  useGetDriveStatus,
  useUpdateDriveSettings,
  useGetDriveProvisionStats,
  useDriveProvisionAll,
  getGetDriveStatusQueryKey,
  getGetDriveProvisionStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DriveFolderTreeEditor } from "./drive-folder-tree-editor";

export function DriveAdminPanel() {
  const qc = useQueryClient();
  const { data: status, isLoading: statusLoading } = useGetDriveStatus({ query: { refetchInterval: false } } as any);
  const { data: stats, isLoading: statsLoading } = useGetDriveProvisionStats();
  const updateSettings = useUpdateDriveSettings();
  const provisionAll = useDriveProvisionAll();

  const [editingRootName, setEditingRootName] = useState(false);
  const [rootName, setRootName] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  const handleSaveRootName = async () => {
    if (!rootName.trim()) return;
    try {
      await updateSettings.mutateAsync({ data: { rootFolderName: rootName.trim() } });
      qc.invalidateQueries({ queryKey: getGetDriveStatusQueryKey() });
      setEditingRootName(false);
      toast.success("Root folder name saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  const handleProvisionAll = async () => {
    if (!confirm(`This will create Drive folders for all un-provisioned clients (${stats?.unprovisioned ?? "?"} clients). This may take several minutes. Proceed?`)) return;
    setProvisioning(true);
    try {
      const result = await provisionAll.mutateAsync();
      qc.invalidateQueries({ queryKey: getGetDriveProvisionStatsQueryKey() });
      toast.success(`Done — ${result.provisioned} folders created, ${result.failed} failed`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Provisioning failed");
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection status card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Connection Status
          </CardTitle>
          <CardDescription>
            Connect using a Google Service Account. Set the <code className="text-xs bg-muted px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> environment secret to the full JSON key from Google Cloud Console.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
            </div>
          ) : status?.connected ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <span className="font-medium text-emerald-700">Connected</span>
                {status.email && <span className="text-muted-foreground ml-2">as {status.email}</span>}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
                <span className="font-medium text-destructive">Not connected</span>
              </div>
              {status?.error && (
                <p className="text-xs text-muted-foreground bg-muted rounded p-2 font-mono break-all">{status.error}</p>
              )}
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-1">
                <p className="font-medium">Setup steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Go to <strong>console.cloud.google.com</strong> → create a project</li>
                  <li>Enable the <strong>Google Drive API</strong></li>
                  <li>Create a <strong>Service Account</strong> → create a JSON key</li>
                  <li>Add the secret <code className="bg-amber-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> with the full JSON contents</li>
                  <li>Share a Google Drive folder with the service account email</li>
                  <li>Set the root folder name below to match</li>
                </ol>
              </div>
            </div>
          )}

          {/* Root folder settings */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Root folder name</p>
                <p className="text-xs text-muted-foreground">All client folders are created inside this Drive folder</p>
              </div>
              {!editingRootName && (
                <Button variant="outline" size="sm" onClick={() => { setRootName(status?.rootFolderName ?? "ClearBooks Clients"); setEditingRootName(true); }}>
                  <Settings className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              )}
            </div>
            {editingRootName ? (
              <div className="flex gap-2">
                <Input
                  value={rootName}
                  onChange={(e) => setRootName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveRootName(); if (e.key === "Escape") setEditingRootName(false); }}
                  className="h-8 text-sm flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveRootName} disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingRootName(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary" className="font-mono">
                  📁 {status?.rootFolderName ?? "ClearBooks Clients"}
                </Badge>
                {status?.rootFolderId && (
                  <span className="text-xs text-muted-foreground">ID: {status.rootFolderId.slice(0, 12)}…</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Provisioning stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Client Folder Provisioning
          </CardTitle>
          <CardDescription>
            Create Drive folders for clients who don't have one yet. Each client gets a folder named <em>"CLIENT_CODE - Client Name"</em> with the subfolder structure defined below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total clients</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{stats?.provisioned ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Have Drive folder</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{stats?.unprovisioned ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">No folder yet</p>
              </div>
            </div>
          )}
          {(stats?.unprovisioned ?? 0) > 0 && (
            <Button
              onClick={handleProvisionAll}
              disabled={provisioning || !status?.connected}
              className="w-full"
            >
              {provisioning ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Provisioning folders…</>
              ) : (
                <><Zap className="h-4 w-4 mr-2" /> Provision all {stats?.unprovisioned} un-provisioned clients</>
              )}
            </Button>
          )}
          {!status?.connected && (
            <p className="text-xs text-muted-foreground text-center">Connect to Google Drive above before provisioning</p>
          )}
          {(stats?.unprovisioned ?? 0) === 0 && (stats?.total ?? 0) > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              All clients have Drive folders
            </div>
          )}
        </CardContent>
      </Card>

      {/* Folder template editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Subfolder Template
          </CardTitle>
          <CardDescription>
            Define the subfolder structure to create inside each client's folder. Hover a folder to add subfolders, rename, or delete.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DriveFolderTreeEditor />
        </CardContent>
      </Card>
    </div>
  );
}
