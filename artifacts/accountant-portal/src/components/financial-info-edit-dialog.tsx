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
  useUpdateFinancialInfo,
  getGetClientQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface FinancialInfoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  financialInfo?: {
    turnover?: number | null;
    profitBeforeTax?: number | null;
    totalIncome?: number | null;
    totalSelfEmploymentIncome?: number | null;
    totalProfitFromSelfEmployments?: number | null;
    avgEmployees?: number | null;
  } | null;
}

const numOrNull = (v: string): number | null => {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

export function FinancialInfoEditDialog({
  open,
  onOpenChange,
  clientId,
  financialInfo,
}: FinancialInfoEditDialogProps) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    turnover: "",
    profitBeforeTax: "",
    totalIncome: "",
    totalSelfEmploymentIncome: "",
    totalProfitFromSelfEmployments: "",
    avgEmployees: "",
  });

  useEffect(() => {
    if (open && financialInfo) {
      setForm({
        turnover: financialInfo.turnover != null ? String(financialInfo.turnover) : "",
        profitBeforeTax: financialInfo.profitBeforeTax != null ? String(financialInfo.profitBeforeTax) : "",
        totalIncome: financialInfo.totalIncome != null ? String(financialInfo.totalIncome) : "",
        totalSelfEmploymentIncome: financialInfo.totalSelfEmploymentIncome != null ? String(financialInfo.totalSelfEmploymentIncome) : "",
        totalProfitFromSelfEmployments: financialInfo.totalProfitFromSelfEmployments != null ? String(financialInfo.totalProfitFromSelfEmployments) : "",
        avgEmployees: financialInfo.avgEmployees != null ? String(financialInfo.avgEmployees) : "",
      });
    }
  }, [open, financialInfo]);

  const updateFinancialInfo = useUpdateFinancialInfo();

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFinancialInfo.mutate(
      {
        clientId,
        data: {
          turnover: numOrNull(form.turnover),
          profitBeforeTax: numOrNull(form.profitBeforeTax),
          totalIncome: numOrNull(form.totalIncome),
          totalSelfEmploymentIncome: numOrNull(form.totalSelfEmploymentIncome),
          totalProfitFromSelfEmployments: numOrNull(form.totalProfitFromSelfEmployments),
          avgEmployees: numOrNull(form.avgEmployees),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
          toast.success("Financial info updated");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to update financial info"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Financial Information</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="turnover">Turnover (£)</Label>
              <Input
                id="turnover"
                type="number"
                value={form.turnover}
                onChange={(e) => set("turnover", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profitBeforeTax">Profit Before Tax (£)</Label>
              <Input
                id="profitBeforeTax"
                type="number"
                value={form.profitBeforeTax}
                onChange={(e) => set("profitBeforeTax", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalIncome">Total Income (£)</Label>
              <Input
                id="totalIncome"
                type="number"
                value={form.totalIncome}
                onChange={(e) => set("totalIncome", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalSelfEmploymentIncome">SE Income (£)</Label>
              <Input
                id="totalSelfEmploymentIncome"
                type="number"
                value={form.totalSelfEmploymentIncome}
                onChange={(e) => set("totalSelfEmploymentIncome", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalProfitFromSelfEmployments">SE Profit (£)</Label>
              <Input
                id="totalProfitFromSelfEmployments"
                type="number"
                value={form.totalProfitFromSelfEmployments}
                onChange={(e) => set("totalProfitFromSelfEmployments", e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avgEmployees">Avg Employees</Label>
              <Input
                id="avgEmployees"
                type="number"
                value={form.avgEmployees}
                onChange={(e) => set("avgEmployees", e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateFinancialInfo.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateFinancialInfo.isPending}>
              {updateFinancialInfo.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
