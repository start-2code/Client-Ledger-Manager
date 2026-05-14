import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreatableCombobox } from "@/components/creatable-combobox";
import {
  useCreateClient,
  useUpdateClient,
  getListClientsQueryKey,
  getGetClientQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const CLIENT_TYPES = [
  "Limited Company (By Shares)",
  "Limited Company (By Guarantee)",
  "Individual",
  "Partnership",
  "Trust",
  "LLP",
  "Sole Trader",
  "Other",
];

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: {
    id: number;
    code: string;
    name: string;
    type: string;
    addressLine1?: string | null;
    addressLine2?: string | null;
    town?: string | null;
    county?: string | null;
    postcode?: string | null;
    contactNumber?: string | null;
    email?: string | null;
  } | null;
}

const empty = {
  code: "",
  name: "",
  type: "",
  addressLine1: "",
  addressLine2: "",
  town: "",
  county: "",
  postcode: "",
  contactNumber: "",
  email: "",
};

export function ClientFormDialog({ open, onOpenChange, client }: ClientFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!client;

  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (client) {
        setForm({
          code: client.code ?? "",
          name: client.name ?? "",
          type: client.type ?? "",
          addressLine1: client.addressLine1 ?? "",
          addressLine2: client.addressLine2 ?? "",
          town: client.town ?? "",
          county: client.county ?? "",
          postcode: client.postcode ?? "",
          contactNumber: client.contactNumber ?? "",
          email: client.email ?? "",
        });
      } else {
        setForm(empty);
      }
      setErrors({});
    }
  }, [open, client]);

  const createClient = useCreateClient();
  const updateClient = useUpdateClient();

  const isPending = createClient.isPending || updateClient.isPending;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Client code is required";
    if (!form.name.trim()) e.name = "Client name is required";
    if (!form.type) e.type = "Client type is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const nullIfEmpty = (v: string) => v.trim() || null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      addressLine1: nullIfEmpty(form.addressLine1),
      addressLine2: nullIfEmpty(form.addressLine2),
      town: nullIfEmpty(form.town),
      county: nullIfEmpty(form.county),
      postcode: nullIfEmpty(form.postcode),
      contactNumber: nullIfEmpty(form.contactNumber),
      email: nullIfEmpty(form.email),
    };

    if (isEdit && client) {
      updateClient.mutate(
        { id: client.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(client.id) });
            toast.success("Client updated successfully");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to update client"),
        }
      );
    } else {
      createClient.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
            toast.success("Client created successfully");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to create client"),
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "New Client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Client Code *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="e.g. ABC001"
                disabled={isEdit}
              />
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Client Type *</Label>
              <CreatableCombobox
                id="type"
                value={form.type}
                onChange={(v) => set("type", v)}
                options={CLIENT_TYPES}
                placeholder="Select or type..."
              />
              {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Client Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Full legal name"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Address</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={form.addressLine1}
                  onChange={(e) => set("addressLine1", e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={form.addressLine2}
                  onChange={(e) => set("addressLine2", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="town">Town / City</Label>
                <Input
                  id="town"
                  value={form.town}
                  onChange={(e) => set("town", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="county">County</Label>
                <Input
                  id="county"
                  value={form.county}
                  onChange={(e) => set("county", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={form.postcode}
                  onChange={(e) => set("postcode", e.target.value)}
                  className="uppercase"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactNumber">Phone</Label>
              <Input
                id="contactNumber"
                value={form.contactNumber}
                onChange={(e) => set("contactNumber", e.target.value)}
                type="tel"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                type="email"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
