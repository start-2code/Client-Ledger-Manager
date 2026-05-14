import React, { useState } from "react";
import { Link } from "wouter";
import { Search, Plus, Building2, User, Users, Briefcase } from "lucide-react";
import { useListClients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsList() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useListClients({
    search: search || undefined,
    type: type !== "all" ? type : undefined,
    page,
    limit: 20
  });

  const getClientIcon = (clientType: string) => {
    switch (clientType) {
      case "Limited Company": return <Building2 className="w-4 h-4 text-slate-500" />;
      case "Individual": return <User className="w-4 h-4 text-slate-500" />;
      case "Partnership": return <Users className="w-4 h-4 text-slate-500" />;
      default: return <Briefcase className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage your client portfolio.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Client
        </Button>
      </div>

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
            <SelectItem value="Limited Company">Limited Company</SelectItem>
            <SelectItem value="Individual">Individual</SelectItem>
            <SelectItem value="Partnership">Partnership</SelectItem>
            <SelectItem value="Trust">Trust</SelectItem>
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
              <TableHead>Email</TableHead>
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
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                </TableRow>
              ))
            ) : data?.clients && data.clients.length > 0 ? (
              data.clients.map((client) => (
                <TableRow key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Link href={`/clients/${client.id}`} className="hover:underline text-primary">{client.code}</Link>
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
                  <TableCell className="text-muted-foreground">
                    {client.town || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.email || '-'}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
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
                disabled={page * 20 >= data.total}
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
