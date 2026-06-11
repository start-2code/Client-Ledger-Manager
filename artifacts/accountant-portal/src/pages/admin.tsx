import React, { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Check, X, Plus, Settings2, Upload, History, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useListDropdownOptions,
  useCreateDropdownOption,
  useUpdateDropdownOption,
  useDeleteDropdownOption,
  getListDropdownOptionsQueryKey,
  useImportPreview,
  useImportRun,
  useImportStatus,
  useImportHistory,
  getImportHistoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ImportPreview, ImportBatch } from "@workspace/api-client-react";
import { format } from "date-fns";

const CATEGORIES = [
  { key: "client_type", label: "Client Types", description: "Entity types used when creating or editing clients." },
  { key: "task_status", label: "Task Statuses", description: "Status values for tasks." },
  { key: "sa_return_status", label: "SA Return Statuses", description: "Self Assessment return status values shown on the Tax Returns page and client SA Returns tab." },
  { key: "activity_type", label: "Activity Types", description: "Activity categories used when creating tasks." },
  { key: "assigned_to", label: "Staff / Assignees", description: "Team members and individuals that can be assigned to tasks." },
  { key: "aml_status", label: "AML Statuses", description: "AML compliance statuses on tax reference records." },
  { key: "engagement_status", label: "Engagement Statuses", description: "Client engagement statuses on tax reference records." },
  { key: "accounts_status", label: "Accounts Statuses", description: "Latest accounts filing statuses on tax reference records." },
];

function CategoryPanel({ category, description }: { category: string; description: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useListDropdownOptions({ category });
  const options = data?.options ?? [];

  const create = useCreateDropdownOption();
  const update = useUpdateDropdownOption();
  const remove = useDeleteDropdownOption();

  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListDropdownOptionsQueryKey({ category }) });
  };

  const handleAdd = async () => {
    const value = newValue.trim();
    if (!value) return;
    try {
      await create.mutateAsync({ data: { category, value } });
      setNewValue("");
      invalidate();
      toast.success(`Added "${value}"`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to add option");
    }
  };

  const handleSaveEdit = async (id: number) => {
    const value = editingValue.trim();
    if (!value) return;
    try {
      await update.mutateAsync({ id, data: { value } });
      setEditingId(null);
      invalidate();
      toast.success("Option updated");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Failed to update option");
    }
  };

  const handleDelete = async (id: number, value: string) => {
    try {
      await remove.mutateAsync({ id });
      invalidate();
      toast.success(`Deleted "${value}"`);
    } catch {
      toast.error("Failed to delete option");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{description}</p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
      ) : options.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No options yet. Add one below.</p>
      ) : (
        <div className="divide-y rounded-md border bg-background">
          {options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2 px-3 py-2.5 group">
              {editingId === opt.id ? (
                <>
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(opt.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="h-7 text-sm flex-1"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 shrink-0" onClick={() => handleSaveEdit(opt.id)} disabled={update.isPending}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{opt.value}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0" onClick={() => { setEditingId(opt.id); setEditingValue(opt.value); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(opt.id, opt.value)} disabled={remove.isPending}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} placeholder="New option…" className="h-9 text-sm" />
        <Button onClick={handleAdd} disabled={!newValue.trim() || create.isPending} size="sm" className="shrink-0">
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}

const DONE_STATUSES = new Set(["success", "partial", "error"]);
const POLL_TIMEOUT_MS = 12 * 60 * 1000; // 12 minutes — give up client-side

function ImportPanel() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [pendingBatchId, setPendingBatchId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const pollStartRef = useRef<number | null>(null);

  const previewMutation = useImportPreview();
  const runMutation = useImportRun();
  const { data: historyData, isLoading: historyLoading } = useImportHistory();
  const batches: ImportBatch[] = historyData?.batches ?? [];

  // Poll the batch status while an import is running
  const { data: batchStatus } = useImportStatus(pendingBatchId ?? 0, {
    query: {
      enabled: !!pendingBatchId,
      refetchInterval: 2000,
    } as any,
  });

  // When the batch finishes, refresh history and clear the pending ID
  React.useEffect(() => {
    if (!batchStatus) return;
    if (DONE_STATUSES.has(batchStatus.status ?? "")) {
      qc.invalidateQueries({ queryKey: getImportHistoryQueryKey() });
      setPendingBatchId(null);
      pollStartRef.current = null;
      if (batchStatus.status === "success") {
        toast.success(
          `Import complete — ${batchStatus.clientsAdded ?? 0} added, ${batchStatus.clientsUpdated ?? 0} updated, ${batchStatus.clientsRemoved ?? 0} removed`
        );
      } else if (batchStatus.status === "partial") {
        toast.warning("Import completed with some errors — see history below");
      } else {
        toast.error(batchStatus.errorMessage ?? "Import failed — see history for details");
      }
    }
  }, [batchStatus?.status]);

  // Client-side safety net: stop polling after POLL_TIMEOUT_MS even if server
  // never transitions the batch to a terminal state.
  React.useEffect(() => {
    if (!pendingBatchId) return;
    if (!pollStartRef.current) pollStartRef.current = Date.now();
    const elapsed = Date.now() - pollStartRef.current;
    if (elapsed > POLL_TIMEOUT_MS) {
      setPendingBatchId(null);
      pollStartRef.current = null;
      qc.invalidateQueries({ queryKey: getImportHistoryQueryKey() });
      toast.error("Import is taking unusually long. Check the history table — it may have completed or failed in the background.");
    }
  }, [batchStatus]);

  const isRunning = !!pendingBatchId;

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setPreview(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".zip")) handleFileSelect(file);
    else toast.error("Please drop a ZIP file");
  };

  const handlePreview = async () => {
    if (!selectedFile) return;
    try {
      const data = await previewMutation.mutateAsync({ data: { file: selectedFile as any } });
      setPreview(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Preview failed");
    }
  };

  const handleRun = async () => {
    if (!selectedFile) return;
    try {
      const data = await runMutation.mutateAsync({ data: { file: selectedFile as any } });
      setPreview(null);
      setPendingBatchId(data.batchId);
      toast.info("Import started — this may take a few minutes…");
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? "Import failed");
    }
  };

  const statusColor: Record<string, string> = {
    success: "bg-emerald-100 text-emerald-700 border-emerald-200",
    partial: "bg-amber-100 text-amber-700 border-amber-200",
    error: "bg-red-100 text-red-700 border-red-200",
    running: "bg-blue-100 text-blue-700 border-blue-200",
    pending: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <div className="space-y-6">
      {/* File drop zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Select TaxCalc Export ZIP</CardTitle>
          <CardDescription>
            Export all client data from TaxCalc as a ZIP file, then upload it here. The import replaces all TaxCalc-sourced data (clients, SA returns, CT returns, financial info, fees, etc.) but never touches manually-entered tasks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  {selectedFile.name}
                </div>
                <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB — click to change</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm font-medium">Drop your TaxCalc ZIP here</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </div>
            )}
          </div>

          {selectedFile && (
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handlePreview}
                variant="outline"
                disabled={previewMutation.isPending}
                className="flex-1"
              >
                {previewMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Preview Changes
              </Button>
              <Button
                onClick={handleRun}
                disabled={runMutation.isPending || isRunning}
                className="flex-1"
              >
                {(runMutation.isPending || isRunning) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {isRunning ? "Importing…" : "Run Import"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview result */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Preview — What will change</CardTitle>
            <CardDescription>Review the impact before running the import.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{preview.totalClients}</p>
                <p className="text-xs text-muted-foreground mt-1">Total clients</p>
              </div>
              <div className="rounded-lg border p-4 text-center bg-emerald-50 border-emerald-200">
                <p className="text-2xl font-bold text-emerald-700">+{preview.clientsToAdd}</p>
                <p className="text-xs text-muted-foreground mt-1">New</p>
              </div>
              <div className="rounded-lg border p-4 text-center bg-blue-50 border-blue-200">
                <p className="text-2xl font-bold text-blue-700">~{preview.clientsToUpdate}</p>
                <p className="text-xs text-muted-foreground mt-1">Updated</p>
              </div>
              <div className="rounded-lg border p-4 text-center bg-amber-50 border-amber-200">
                <p className="text-2xl font-bold text-amber-700">-{preview.clientsToRemove}</p>
                <p className="text-xs text-muted-foreground mt-1">Removed</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{preview.saReturnsCount ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">SA returns</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{preview.ctReturnsCount ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">CT returns</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{preview.fileCount ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Files parsed</p>
              </div>
            </div>
            {preview.parseErrors && preview.parseErrors.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {preview.parseErrors.length} parse warning(s)
                </p>
                <ul className="mt-2 space-y-1">
                  {preview.parseErrors.slice(0, 5).map((e, i) => (
                    <li key={i} className="text-xs text-amber-700 font-mono">{e}</li>
                  ))}
                  {preview.parseErrors.length > 5 && (
                    <li className="text-xs text-amber-600">…and {preview.parseErrors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Running progress indicator */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              Import in Progress
            </CardTitle>
            <CardDescription>
              Processing your TaxCalc export — this typically takes 2–5 minutes. You can navigate away and come back; the import will continue in the background.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground">{batchStatus?.status ?? "pending"}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Import History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
          ) : batches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No imports yet.</p>
          ) : (
            <div className="divide-y">
              {batches.map((b) => (
                <div key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor[b.status ?? ""] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        {b.status ?? "unknown"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{b.filename ?? "unknown"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.importedAt ? format(new Date(b.importedAt), "d MMM yyyy, HH:mm") : ""}{" "}
                      by {b.importedBy ?? "system"}
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {b.totalClients != null && <span>{b.totalClients} clients</span>}
                    {b.clientsAdded != null && <span className="text-emerald-600">+{b.clientsAdded}</span>}
                    {b.clientsUpdated != null && <span className="text-blue-600">~{b.clientsUpdated}</span>}
                    {b.clientsRemoved != null && <span className="text-amber-600">-{b.clientsRemoved}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  return (
    <div>
      <div className="mb-8 flex items-start gap-4">
        <div className="bg-primary/10 p-2.5 rounded-md">
          <Settings2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage dropdown options and import client data from TaxCalc.
          </p>
        </div>
      </div>

      <Tabs defaultValue="import">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="import">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            TaxCalc Import
          </TabsTrigger>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.key} value={cat.key}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="import">
          <ImportPanel />
        </TabsContent>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.key} value={cat.key}>
            <Card>
              <CardHeader>
                <CardTitle>{cat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryPanel category={cat.key} description={cat.description} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
