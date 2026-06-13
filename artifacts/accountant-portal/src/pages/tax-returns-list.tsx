import React, { useState } from "react";
import { Link } from "wouter";
import {
  useListTaxReturns,
  useUpdateTaxReturn,
  getListTaxReturnsQueryKey,
  useListDropdownOptions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function TaxReturnsList() {
  // Get initial status from URL query parameter
  const initialStatus = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('status') || 'all';
  
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(initialStatus);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: statusData } = useListDropdownOptions({ category: "sa_return_status" });
  const saStatuses = statusData?.options.map((o) => o.value) ?? [];

  const { data, isLoading } = useListTaxReturns({
    search: search || undefined,
    status: status !== "all" ? status : undefined,
    page,
    limit: 50
  });

  const updateTaxReturn = useUpdateTaxReturn();

  const handleStatusChange = (id: number, newStatus: string) => {
    updateTaxReturn.mutate({ id, data: { taxReturnStatus: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTaxReturnsQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">SA Tax Returns</h1>
          <p className="text-muted-foreground mt-1">Track Self Assessment filing progress.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {saStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Client Code</TableHead>
              <TableHead>Client Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[280px]">Return Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : data?.taxReturns && data.taxReturns.length > 0 ? (
              data.taxReturns.map((tr) => (
                <TableRow key={tr.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {tr.clientId ? (
                      <Link href={`/clients/${tr.clientId}`} className="hover:underline text-primary">
                        {tr.clientCode || '-'}
                      </Link>
                    ) : (
                      tr.clientCode || '-'
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {tr.clientName}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {tr.clientType || '-'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={tr.taxReturnStatus || ""}
                      onValueChange={(val) => handleStatusChange(tr.id, val)}
                      disabled={updateTaxReturn.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs font-medium">
                        <SelectValue placeholder="Set status…" />
                      </SelectTrigger>
                      <SelectContent>
                        {saStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p>No tax returns found.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data && data.total > 0 && (
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, data.total)} of {data.total} records
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 50 >= data.total}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
