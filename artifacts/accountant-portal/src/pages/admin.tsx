import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Check, X, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  useListDropdownOptions,
  useCreateDropdownOption,
  useUpdateDropdownOption,
  useDeleteDropdownOption,
  getListDropdownOptionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  { key: "client_type", label: "Client Types", description: "Entity types used when creating or editing clients." },
  { key: "task_status", label: "Task Statuses", description: "Status values for tasks." },
  { key: "activity_type", label: "Activity Types", description: "Activity categories used when creating tasks." },
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
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-green-600 hover:text-green-700 shrink-0"
                    onClick={() => handleSaveEdit(opt.id)}
                    disabled={update.isPending}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{opt.value}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => {
                        setEditingId(opt.id);
                        setEditingValue(opt.value);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleDelete(opt.id, opt.value)}
                      disabled={remove.isPending}
                    >
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
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="New option…"
          className="h-9 text-sm"
        />
        <Button
          onClick={handleAdd}
          disabled={!newValue.trim() || create.isPending}
          size="sm"
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
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
            Manage the dropdown options that appear in forms across the portal.
          </p>
        </div>
      </div>

      <Tabs defaultValue="client_type">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.key} value={cat.key}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

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
