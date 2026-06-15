import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Pencil, Trash2, Check, X, GripVertical } from "lucide-react";
import {
  useGetDriveFolderTemplate,
  useCreateDriveFolderTemplateNode,
  useUpdateDriveFolderTemplateNode,
  useDeleteDriveFolderTemplateNode,
  getGetDriveFolderTemplateQueryKey,
} from "@workspace/api-client-react";
import type { DriveFolderTemplateNode } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface NodeRowProps {
  node: DriveFolderTemplateNode;
  depth: number;
  onRefresh: () => void;
}

function NodeRow({ node, depth, onRefresh }: NodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [addingChild, setAddingChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");

  const update = useUpdateDriveFolderTemplateNode();
  const remove = useDeleteDriveFolderTemplateNode();
  const create = useCreateDriveFolderTemplateNode();

  const hasChildren = node.children && node.children.length > 0;

  const handleRename = async () => {
    if (!editName.trim()) return;
    try {
      await update.mutateAsync({ id: node.id, data: { name: editName.trim() } });
      setEditing(false);
      onRefresh();
    } catch {
      toast.error("Failed to rename folder");
    }
  };

  const handleDelete = async () => {
    const label = hasChildren ? `"${node.name}" and all its subfolders` : `"${node.name}"`;
    if (!confirm(`Delete ${label}? This only removes the template — existing Drive folders are not affected.`)) return;
    try {
      await remove.mutateAsync({ id: node.id });
      onRefresh();
      toast.success(`Deleted "${node.name}"`);
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  const handleAddChild = async () => {
    if (!newChildName.trim()) return;
    try {
      await create.mutateAsync({ data: { name: newChildName.trim(), parentId: node.id, sortOrder: (node.children?.length ?? 0) } });
      setNewChildName("");
      setAddingChild(false);
      setExpanded(true);
      onRefresh();
      toast.success(`Added "${newChildName.trim()}"`);
    } catch {
      toast.error("Failed to add subfolder");
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 rounded hover:bg-muted/50 group"
        style={{ paddingLeft: `${8 + depth * 20}px` }}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
        <button
          className="p-0.5 text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <span className="w-3.5 inline-block" />
          )}
        </button>
        {expanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-amber-400 shrink-0" />
        )}

        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") { setEditing(false); setEditName(node.name); } }}
              className="h-6 text-sm py-0 flex-1"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={handleRename} disabled={update.isPending}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditing(false); setEditName(node.name); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="flex-1 text-sm truncate">{node.name}</span>
        )}

        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Add subfolder" onClick={() => { setAddingChild(true); setExpanded(true); }}>
              <Plus className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground" title="Rename" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" title="Delete" onClick={handleDelete} disabled={remove.isPending}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {expanded && (
        <>
          {node.children?.map((child) => (
            <NodeRow key={child.id} node={child} depth={depth + 1} onRefresh={onRefresh} />
          ))}
          {addingChild && (
            <div className="flex items-center gap-1 py-1" style={{ paddingLeft: `${8 + (depth + 1) * 20 + 24}px` }}>
              <Folder className="h-4 w-4 text-amber-300 shrink-0" />
              <Input
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddChild(); if (e.key === "Escape") { setAddingChild(false); setNewChildName(""); } }}
                placeholder="Subfolder name…"
                className="h-6 text-sm py-0 flex-1"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-600" onClick={handleAddChild} disabled={create.isPending}>
                <Check className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setAddingChild(false); setNewChildName(""); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function DriveFolderTreeEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetDriveFolderTemplate();
  const create = useCreateDriveFolderTemplateNode();
  const [newRootName, setNewRootName] = useState("");
  const [addingRoot, setAddingRoot] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: getGetDriveFolderTemplateQueryKey() });

  const nodes = data?.nodes ?? [];

  const handleAddRoot = async () => {
    if (!newRootName.trim()) return;
    try {
      await create.mutateAsync({ data: { name: newRootName.trim(), parentId: null, sortOrder: nodes.length } });
      setNewRootName("");
      setAddingRoot(false);
      refresh();
      toast.success(`Added "${newRootName.trim()}"`);
    } catch {
      toast.error("Failed to add folder");
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This template defines the subfolder structure created inside every client's Drive folder when provisioned.
        Changes here only affect future provisioning — existing folders in Drive are not modified.
      </p>

      {nodes.length === 0 && !addingRoot ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No folders defined yet. Add a top-level folder to get started.
        </div>
      ) : (
        <div className="rounded-md border bg-background divide-y">
          <div className="py-1">
            {nodes.map((node) => (
              <NodeRow key={node.id} node={node} depth={0} onRefresh={refresh} />
            ))}
          </div>
          {addingRoot && (
            <div className="flex items-center gap-2 p-2">
              <Folder className="h-4 w-4 text-amber-400 shrink-0 ml-8" />
              <Input
                value={newRootName}
                onChange={(e) => setNewRootName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddRoot(); if (e.key === "Escape") { setAddingRoot(false); setNewRootName(""); } }}
                placeholder="Top-level folder name…"
                className="h-7 text-sm flex-1"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={handleAddRoot} disabled={create.isPending}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAddingRoot(false); setNewRootName(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {!addingRoot && (
        <Button variant="outline" size="sm" onClick={() => setAddingRoot(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add top-level folder
        </Button>
      )}
    </div>
  );
}
