import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, XCircle, Loader2, HardDrive, FolderTree, Settings, Users, Zap,
  LogIn, LogOut, Upload,
} from "lucide-react";
import {
  useGetDriveStatus,
  useUpdateDriveSettings,
  useGetDriveProvisionStats,
  useDriveProvisionAll,
  useDisconnectDriveOAuth,
  getGetDriveStatusQueryKey,
  getGetDriveProvisionStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DriveFolderTreeEditor } from "./drive-folder-tree-editor";

export function DriveAdminPanel() {
  const qc = useQueryClient();
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useGetDriveStatus({ query: { refetchInterval: false } } as any);
  const { data: stats, isLoading: statsLoading } = useGetDriveProvisionStats();
  const updateSettings = useUpdateDriveSettings();
  const provisionAll = useDriveProvisionAll();
  const disconnectOAuth = useDisconnectDriveOAuth();

  const [editingRootName, setEditingRootName] = useState(false);
  const [rootName, setRootName] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  // Handle OAuth redirect result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthResult = params.get("oauth");
    if (oauthResult === "success") {
      toast.success("Google Account connected for uploads");
      refetchStatus();
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth");
      window.history.replaceState({}, "", url.toString());
    } else if (oauthResult === "error") {
      const msg = params.get("msg") ?? "OAuth failed";
      toast.error(`Connection failed: ${msg}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth");
      url.searchParams.delete("msg");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

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
      await qc.invalidateQueries({ queryKey: getGetDriveProvisionStatsQueryKey() });
      toast.success(`Done — ${result.provisioned} folders created, ${result.failed} failed`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Provisioning failed");
    } finally {
      setProvisioning(false);
    }
  };

  const handleConnectGoogle = async () => {
    // Open the tab immediately (synchronous with user click) to avoid popup blockers,
    // then navigate it once the URL arrives from the server.
    const tab = window.open("", "_blank");
    try {
      const res = await fetch("/api/drive/oauth/url");
      if (!res.ok) {
        tab?.close();
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Could not generate OAuth URL — check GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET secrets are set");
        return;
      }
      const { url } = await res.json();
      if (tab) {
        tab.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    } catch {
      tab?.close();
      toast.error("Failed to initiate Google sign-in");
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Disconnect your Google Account? Uploads will stop working until you reconnect.")) return;
    try {
      await disconnectOAuth.mutateAsync();
      qc.invalidateQueries({ queryKey: getGetDriveStatusQueryKey() });
      toast.success("Google Account disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const oauthSecretsSet = (() => {
    // We can't check env vars from the frontend, so just try based on error from status
    return true;
  })();

  return (
    <div className="space-y-6">
      {/* Service account connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Service Account — Folder Management
          </CardTitle>
          <CardDescription>
            Used for creating and listing client folders. Set <code className="text-xs bg-muted px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> secret to the full JSON key.
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
                  <li>Add secret <code className="bg-amber-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> with the full JSON contents</li>
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

      {/* Google Account for uploads */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Google Account — File Uploads
          </CardTitle>
          <CardDescription>
            Uploads are made as your personal Google account (which has storage quota). Requires <code className="text-xs bg-muted px-1 rounded">GOOGLE_OAUTH_CLIENT_ID</code> and <code className="text-xs bg-muted px-1 rounded">GOOGLE_OAUTH_CLIENT_SECRET</code> secrets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </div>
          ) : status?.oauthConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-medium text-emerald-700">Connected</span>
                  {status.oauthEmail && <span className="text-muted-foreground ml-2">as {status.oauthEmail}</span>}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={handleDisconnectGoogle}
                disabled={disconnectOAuth.isPending}
              >
                {disconnectOAuth.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-3.5 w-3.5 mr-1.5" />Disconnect</>}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <span className="text-amber-700 font-medium">Not connected — uploads will fail</span>
              </div>
              <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
                <p className="font-medium text-sm">One-time setup (2 minutes):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>In Google Cloud Console → <strong>APIs &amp; Services → Credentials</strong></li>
                  <li>Click <strong>+ Create Credentials → OAuth 2.0 Client ID</strong></li>
                  <li>Application type: <strong>Web application</strong></li>
                  <li>Under "Authorized redirect URIs" add:<br />
                    <code className="bg-blue-100 px-1 rounded break-all text-xs">
                      https://{window.location.hostname}/api/drive/oauth/callback
                    </code>
                  </li>
                  <li>Copy the Client ID and Client Secret</li>
                  <li>Add secrets: <code className="bg-blue-100 px-1 rounded">GOOGLE_OAUTH_CLIENT_ID</code> and <code className="bg-blue-100 px-1 rounded">GOOGLE_OAUTH_CLIENT_SECRET</code></li>
                  <li>Restart the API server, then click Connect below</li>
                </ol>
              </div>
              <Button onClick={handleConnectGoogle} className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Connect Google Account
              </Button>
            </div>
          )}
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
            <p className="text-xs text-muted-foreground text-center">Connect service account above before provisioning</p>
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
