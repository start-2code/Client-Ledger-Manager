import React, { useState } from "react";
import { Link, useSearch } from "wouter";
import { Search, Plus, Building2, User, Users, Briefcase, MoreHorizontal, Pencil, Trash2, MapPin, X } from "lucide-react";
import {
  useListClients,
  useDeleteClient,
  getListClientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientFormDialog } from "@/components/client-form-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { toast } from "sonner";
import { useListDropdownOptions } from "@workspace/api-client-react";


type ClientRow = {
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
};

export default function ClientsList() {
  const searchParams = new URLSearchParams(useSearch());
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [assignedOffice, setAssignedOffice] = useState<string>("all");
  const [yearEndMonth] = useState<string>(searchParams.get("yearEndMonth") ?? "");
  const [engagementRecency] = useState<string>(searchParams.get("engagementRecency") ?? "");
  const [amlReviewDue] = useState<boolean>(searchParams.get("amlReviewDue") === "true");
  const [page, setPage] = useState(1);

  const OFFICE_OPTIONS = [
    "Clapham Common",
    "DBW Wallington",
    "Just Simply Organised Ltd",
    "Tooting",
    "Wallington",
  ];

  const { data: dropdownData } = useListDropdownOptions({ category: "client_type" });
  const clientTypeOptions = dropdownData?.options ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editClient, setEditClient] = useState<ClientRow | null>(null);
  const [deleteClient, setDeleteClient] = useState<ClientRow | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useListClients({
    search: search || undefined,
    type: type !== "all" ? type : undefined,
    assignedOffice: assignedOffice !== "all" ? assignedOffice : undefined,
    yearEndMonth: yearEndMonth || undefined,
    engagementRecency: (engagementRecency as "recent" | "not_recent") || undefined,
    amlReviewDue: amlReviewDue || undefined,
    page,
    limit: 20,
  });

  const deleteClientMutation = useDeleteClient();

  const handleDelete = () => {
    if (!deleteClient) return;
    deleteClientMutation.mutate(
      { id: deleteClient.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast.success(`${deleteClient.name} deleted`);
          setDeleteClient(null);
        },
        onError: () => toast.error("Failed to delete client"),
      }
    );
  };

  const getClientIcon = (clientType: string) => {
    if (clientType.includes("Individual")) return <User className="w-4 h-4 text-slate-500" />;
    if (clientType.includes("Partnership") || clientType.includes("LLP")) return <Users className="w-4 h-4 text-slate-500" />;
    if (clientType.includes("Company") || clientType.includes("Limited")) return <Building2 className="w-4 h-4 text-slate-500" />;
    return <Briefcase className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage your client portfolio.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Client
        </Button>
      </div>

      {(yearEndMonth || engagementRecency || amlReviewDue) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg text-sm">
          <span className="text-primary font-medium">
            {yearEndMonth && `Filtered: year-ends in ${yearEndMonth}`}
            {engagementRecency === "recent" && "Filtered: recently engaged clients"}
            {engagementRecency === "not_recent" && "Filtered: clients not recently engaged"}
            {amlReviewDue && "Filtered: AML review overdue (> 12 months)"}
          </span>
          <Link href="/clients">
            <button className="ml-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, name..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={type} onValueChange={(val) => { setType(val); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Client Type" />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {clientTypeOptions.map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.value}
                </SelectItem>
              ))}
            </SelectContent>
        </Select>
        <Select value={assignedOffice} onValueChange={(val) => { setAssignedOffice(val); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All Offices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Offices</SelectItem>
            {OFFICE_OPTIONS.map((office) => (
              <SelectItem key={office} value={office}>{office}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Office</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : data?.clients && data.clients.length > 0 ? (
              data.clients.map((client) => (
                <TableRow key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Link href={`/clients/${client.id}`} className="hover:underline text-primary">
                      {client.code}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/clients/${client.id}`}>{client.name}</Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getClientIcon(client.type)}
                      <span className="text-sm">{client.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.town || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.assignedOffice ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-sm">{client.assignedOffice}</span>
                      </div>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.email || '-'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/clients/${client.id}`}>View Details</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditClient(client as ClientRow)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteClient(client as ClientRow)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No clients found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data && data.total > 0 && (
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} clients
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ClientFormDialog
        open={createOpen || !!editClient}
        onOpenChange={(o) => {
          if (!o) { setCreateOpen(false); setEditClient(null); }
        }}
        client={editClient}
      />

      <DeleteConfirmDialog
        open={!!deleteClient}
        onOpenChange={(o) => { if (!o) setDeleteClient(null); }}
        title="Delete Client"
        description={`Are you sure you want to delete "${deleteClient?.name}"? This will also remove all associated tasks, financial info, tax references, and tax return records. This action cannot be undone.`}
        onConfirm={handleDelete}
        isLoading={deleteClientMutation.isPending}
      />
    </div>
  );
}
