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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useUpdateTaxReference,
  getGetClientQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const AML_STATUSES = ["Complete", "In Progress", "Not Started", "Not Required"];
const ENGAGEMENT_STATUSES = ["Active", "Inactive", "Suspended"];
const ACCOUNTS_STATUSES = ["Filed", "Overdue", "Not Required", "In Progress"];

interface TaxReferenceEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  taxReference?: {
    utr?: string | null;
    payeRef?: string | null;
    payeAccountsOfficeRef?: string | null;
    vatRegNo?: string | null;
    vatRegDate?: string | null;
    taxOffice?: string | null;
    niNumber?: string | null;
    companyRegNo?: string | null;
    dateOfIncorporation?: string | null;
    amlStatus?: string | null;
    latestAccountsStatus?: string | null;
    engagementStatus?: string | null;
  } | null;
}

const EMPTY = {
  utr: "",
  payeRef: "",
  payeAccountsOfficeRef: "",
  vatRegNo: "",
  vatRegDate: "",
  taxOffice: "",
  niNumber: "",
  companyRegNo: "",
  dateOfIncorporation: "",
  amlStatus: "",
  latestAccountsStatus: "",
  engagementStatus: "",
};

export function TaxReferenceEditDialog({
  open,
  onOpenChange,
  clientId,
  taxReference,
}: TaxReferenceEditDialogProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (open) {
      setForm({
        utr: taxReference?.utr ?? "",
        payeRef: taxReference?.payeRef ?? "",
        payeAccountsOfficeRef: taxReference?.payeAccountsOfficeRef ?? "",
        vatRegNo: taxReference?.vatRegNo ?? "",
        vatRegDate: taxReference?.vatRegDate ?? "",
        taxOffice: taxReference?.taxOffice ?? "",
        niNumber: taxReference?.niNumber ?? "",
        companyRegNo: taxReference?.companyRegNo ?? "",
        dateOfIncorporation: taxReference?.dateOfIncorporation ?? "",
        amlStatus: taxReference?.amlStatus ?? "",
        latestAccountsStatus: taxReference?.latestAccountsStatus ?? "",
        engagementStatus: taxReference?.engagementStatus ?? "",
      });
    }
  }, [open, taxReference]);

  const updateTaxReference = useUpdateTaxReference();

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const nullIfEmpty = (v: string) => v.trim() || null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTaxReference.mutate(
      {
        clientId,
        data: {
          utr: nullIfEmpty(form.utr),
          payeRef: nullIfEmpty(form.payeRef),
          payeAccountsOfficeRef: nullIfEmpty(form.payeAccountsOfficeRef),
          vatRegNo: nullIfEmpty(form.vatRegNo),
          vatRegDate: nullIfEmpty(form.vatRegDate),
          taxOffice: nullIfEmpty(form.taxOffice),
          niNumber: nullIfEmpty(form.niNumber),
          companyRegNo: nullIfEmpty(form.companyRegNo),
          dateOfIncorporation: nullIfEmpty(form.dateOfIncorporation),
          amlStatus: nullIfEmpty(form.amlStatus),
          latestAccountsStatus: nullIfEmpty(form.latestAccountsStatus),
          engagementStatus: nullIfEmpty(form.engagementStatus),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
          toast.success("Tax references updated");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to update tax references"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tax & Registration Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Reference Numbers</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="utr">UTR</Label>
                <Input id="utr" value={form.utr} onChange={(e) => set("utr", e.target.value)} placeholder="10-digit UTR" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="niNumber">NI Number</Label>
                <Input id="niNumber" value={form.niNumber} onChange={(e) => set("niNumber", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyRegNo">Company Reg No</Label>
                <Input id="companyRegNo" value={form.companyRegNo} onChange={(e) => set("companyRegNo", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vatRegNo">VAT Reg No</Label>
                <Input id="vatRegNo" value={form.vatRegNo} onChange={(e) => set("vatRegNo", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payeRef">PAYE Ref</Label>
                <Input id="payeRef" value={form.payeRef} onChange={(e) => set("payeRef", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payeAccountsOfficeRef">PAYE Accounts Office Ref</Label>
                <Input id="payeAccountsOfficeRef" value={form.payeAccountsOfficeRef} onChange={(e) => set("payeAccountsOfficeRef", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxOffice">Tax Office</Label>
                <Input id="taxOffice" value={form.taxOffice} onChange={(e) => set("taxOffice", e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Dates</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="vatRegDate">VAT Reg Date</Label>
                <Input id="vatRegDate" type="date" value={form.vatRegDate} onChange={(e) => set("vatRegDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateOfIncorporation">Date of Incorporation</Label>
                <Input id="dateOfIncorporation" type="date" value={form.dateOfIncorporation} onChange={(e) => set("dateOfIncorporation", e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3">Statuses</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amlStatus">AML Status</Label>
                <Select value={form.amlStatus || "__none__"} onValueChange={(v) => set("amlStatus", v === "__none__" ? "" : v)}>
                  <SelectTrigger id="amlStatus"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not Set</SelectItem>
                    {AML_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="engagementStatus">Engagement Status</Label>
                <Select value={form.engagementStatus || "__none__"} onValueChange={(v) => set("engagementStatus", v === "__none__" ? "" : v)}>
                  <SelectTrigger id="engagementStatus"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not Set</SelectItem>
                    {ENGAGEMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="latestAccountsStatus">Latest Accounts Status</Label>
                <Select value={form.latestAccountsStatus || "__none__"} onValueChange={(v) => set("latestAccountsStatus", v === "__none__" ? "" : v)}>
                  <SelectTrigger id="latestAccountsStatus"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Not Set</SelectItem>
                    {ACCOUNTS_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateTaxReference.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTaxReference.isPending}>
              {updateTaxReference.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
