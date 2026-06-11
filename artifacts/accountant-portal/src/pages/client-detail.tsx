import React, { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetClient,
  useUpdateTask,
  useDeleteTask,
  useDeleteClient,
  getGetClientQueryKey,
  getListClientsQueryKey,
  getListTasksQueryKey,
  useListDropdownOptions,
  useGetSaReturnsForClient,
  getGetSaReturnsForClientQueryKey,
  useGetCtReturnsForClient,
  getGetCtReturnsForClientQueryKey,
  useGetAccountsPeriodsForClient,
  getGetAccountsPeriodsForClientQueryKey,
  useGetClientFees,
  getGetClientFeesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin, Phone, Mail, CheckCircle2, Clock, Building2, User, Users, Briefcase,
  MoreHorizontal, Pencil, Trash2, Plus, FileText, PoundSterling, Receipt,
} from "lucide-react";
import { format } from "date-fns";
import { ClientFormDialog } from "@/components/client-form-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { FinancialInfoEditDialog } from "@/components/financial-info-edit-dialog";
import { TaxReferenceEditDialog } from "@/components/tax-reference-edit-dialog";
import { toast } from "sonner";

function fmt(v: string | number | null | undefined): string {
  if (v == null) return "—";
  return String(v);
}

function fmtMoney(v: string | number | null | undefined): string {
  if (v == null) return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtBool(v: boolean | null | undefined): string {
  if (v == null) return "—";
  return v ? "Yes" : "No";
}

function saStatusColor(status: string | null | undefined): string {
  if (!status) return "bg-gray-100 text-gray-600";
  const s = status.toLowerCase();
  if (s.includes("filed") || s.includes("complete")) return "bg-emerald-100 text-emerald-700";
  if (s.includes("progress") || s.includes("review")) return "bg-blue-100 text-blue-700";
  if (s.includes("overdue") || s.includes("late")) return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const [, navigate] = useLocation();
  const id = parseInt(params?.id || "0", 10);
  const queryClient = useQueryClient();

  const { data: taskStatusData } = useListDropdownOptions({ category: "task_status" });
  const taskStatuses = taskStatusData?.options.map((o) => o.value) ?? ["Planned", "In Progress", "Complete"];

  const { data, isLoading } = useGetClient(id, {
    query: { enabled: !!id, queryKey: getGetClientQueryKey(id) },
  });

  const { data: saData } = useGetSaReturnsForClient(id, {
    query: { enabled: !!id, queryKey: getGetSaReturnsForClientQueryKey(id) },
  });
  const { data: ctData } = useGetCtReturnsForClient(id, {
    query: { enabled: !!id, queryKey: getGetCtReturnsForClientQueryKey(id) },
  });
  const { data: apData } = useGetAccountsPeriodsForClient(id, {
    query: { enabled: !!id, queryKey: getGetAccountsPeriodsForClientQueryKey(id) },
  });
  const { data: feesData } = useGetClientFees(id, {
    query: { enabled: !!id, queryKey: getGetClientFeesQueryKey(id) },
  });

  const saReturns = saData?.saReturns ?? [];
  const ctReturns = ctData?.ctReturns ?? [];
  const accountsPeriods = apData?.accountsPeriods ?? [];
  const fees = feesData?.fees ?? null;

  const updateTask = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const deleteClientMutation = useDeleteClient();

  const [editClientOpen, setEditClientOpen] = useState(false);
  const [deleteClientOpen, setDeleteClientOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [deleteTask, setDeleteTask] = useState<any>(null);
  const [editFinancialOpen, setEditFinancialOpen] = useState(false);
  const [editTaxRefOpen, setEditTaxRefOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-1/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data) return <div>Client not found</div>;

  const { client, financialInfo, taxReference, tasks } = data;

  const getClientIcon = (clientType: string) => {
    if (clientType.includes("Individual")) return <User className="w-5 h-5" />;
    if (clientType.includes("Partnership") || clientType.includes("LLP")) return <Users className="w-5 h-5" />;
    if (clientType.includes("Company") || clientType.includes("Limited")) return <Building2 className="w-5 h-5" />;
    return <Briefcase className="w-5 h-5" />;
  };

  const handleTaskStatusChange = (taskId: number, newStatus: string) => {
    updateTask.mutate(
      { id: taskId, data: { taskStatus: newStatus } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(id) }) }
    );
  };

  const handleDeleteTask = () => {
    if (!deleteTask) return;
    deleteTaskMutation.mutate(
      { id: deleteTask.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast.success("Task deleted");
          setDeleteTask(null);
        },
        onError: () => toast.error("Failed to delete task"),
      }
    );
  };

  const handleDeleteClient = () => {
    deleteClientMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          toast.success(`${client.name} deleted`);
          navigate("/clients");
        },
        onError: () => toast.error("Failed to delete client"),
      }
    );
  };

  // Group SA returns by type, sorted by year desc
  const personalReturns = saReturns.filter((r) => r.returnType === "personal").sort((a, b) => b.taxYear.localeCompare(a.taxYear));
  const trustReturns = saReturns.filter((r) => r.returnType === "trust").sort((a, b) => b.taxYear.localeCompare(a.taxYear));
  const partnershipReturns = saReturns.filter((r) => r.returnType === "partnership").sort((a, b) => b.taxYear.localeCompare(a.taxYear));

  const latestCt = ctReturns[0] ?? null;
  const latestAp = accountsPeriods[0] ?? null;

  const feeRows = fees
    ? [
        { label: "Annual Accounts", flag: fees.annualAccountsFlag, fee: fees.annualAccountsFee },
        { label: "Tax Return", flag: fees.taxReturnFlag, fee: fees.taxReturnFee },
        { label: "Audit", flag: fees.auditFlag, fee: fees.auditFee },
        { label: "Bookkeeping", flag: fees.bookkeepingFlag, fee: fees.bookkeepingFee },
        { label: "VAT Returns", flag: fees.vatReturnsFlag, fee: fees.vatReturnsFee },
        { label: "Payroll", flag: fees.payrollFlag, fee: fees.payrollFee },
        { label: "Consultancy", flag: fees.consultancyFlag, fee: fees.consultancyFee },
        { label: "Cashflow", flag: fees.cashflowFlag, fee: fees.cashflowFee },
        { label: "Management Accounts", flag: fees.managementAccountsFlag, fee: fees.managementAccountsFee },
        { label: "Company Secretarial", flag: fees.companySecretarialFlag, fee: fees.companySecretarialFee },
        { label: "Other", flag: fees.otherFlag, fee: fees.otherFee },
      ].filter((r) => r.flag || (r.fee && Number(r.fee) > 0))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/clients" className="hover:text-foreground hover:underline">Clients</Link>
          <span>/</span>
          <span className="font-mono">{client.code}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {client.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1">
                {getClientIcon(client.type)}
                {client.type}
              </span>
              {(client as any).engagementStatus && (
                <Badge variant="outline" className="text-xs">{(client as any).engagementStatus}</Badge>
              )}
              {(client as any).archived === true && (
                <Badge variant="secondary" className="text-xs">Archived</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditClientOpen(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Client
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteClientOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="contact" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-2">
          <TabsTrigger value="contact" className="text-xs sm:text-sm">Contact</TabsTrigger>
          <TabsTrigger value="financial" className="text-xs sm:text-sm">Financials</TabsTrigger>
          <TabsTrigger value="tax" className="text-xs sm:text-sm">Tax Refs</TabsTrigger>
          <TabsTrigger value="sa" className="text-xs sm:text-sm">
            SA Returns {saReturns.length > 0 && <span className="ml-1 bg-primary/10 text-primary text-xs rounded px-1">{saReturns.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="ct" className="text-xs sm:text-sm">CT Return</TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs sm:text-sm">Accounts</TabsTrigger>
          <TabsTrigger value="fees" className="text-xs sm:text-sm">Fees</TabsTrigger>
          <TabsTrigger value="tasks" className="text-xs sm:text-sm">Tasks ({tasks?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Contact Tab */}
        <TabsContent value="contact" className="mt-4 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{client.email || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{client.contactNumber || "Not provided"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground space-y-1">
                    {client.addressLine1 && <p>{client.addressLine1}</p>}
                    {client.addressLine2 && <p>{client.addressLine2}</p>}
                    {client.town && <p>{client.town}</p>}
                    {client.county && <p>{client.county}</p>}
                    {client.postcode && <p className="font-mono mt-2">{client.postcode}</p>}
                    {!client.addressLine1 && !client.town && <p>No address on file</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Extra client fields from TaxCalc */}
          {((client as any).occupation || (client as any).businessType || (client as any).dateOfIncorporation || (client as any).tradingStatus || (client as any).companyType) && (
            <Card>
              <CardHeader>
                <CardTitle>Business Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 text-sm">
                  {(client as any).occupation && <div><p className="font-medium text-muted-foreground mb-0.5">Occupation</p><p>{(client as any).occupation}</p></div>}
                  {(client as any).businessType && <div><p className="font-medium text-muted-foreground mb-0.5">Business Type</p><p>{(client as any).businessType}</p></div>}
                  {(client as any).companyType && <div><p className="font-medium text-muted-foreground mb-0.5">Company Type</p><p>{(client as any).companyType}</p></div>}
                  {(client as any).tradingStatus && <div><p className="font-medium text-muted-foreground mb-0.5">Trading Status</p><p>{(client as any).tradingStatus}</p></div>}
                  {(client as any).dateOfIncorporation && <div><p className="font-medium text-muted-foreground mb-0.5">Incorporated</p><p>{(client as any).dateOfIncorporation}</p></div>}
                  {(client as any).dateOfCommencement && <div><p className="font-medium text-muted-foreground mb-0.5">Commenced</p><p>{(client as any).dateOfCommencement}</p></div>}
                  {(client as any).usualYearEnd && <div><p className="font-medium text-muted-foreground mb-0.5">Year End</p><p>{(client as any).usualYearEnd}</p></div>}
                  {(client as any).assignedOffice && <div><p className="font-medium text-muted-foreground mb-0.5">Office</p><p>{(client as any).assignedOffice}</p></div>}
                  {(client as any).bookkeepingSoftware && <div><p className="font-medium text-muted-foreground mb-0.5">Bookkeeping Software</p><p>{(client as any).bookkeepingSoftware}</p></div>}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financial" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Financial Information</CardTitle>
                <CardDescription>Latest available figures</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditFinancialOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />Edit
              </Button>
            </CardHeader>
            <CardContent>
              {financialInfo ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {financialInfo.turnover != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Turnover</p>
                      <p className="text-2xl font-bold">{fmtMoney(financialInfo.turnover)}</p>
                    </div>
                  )}
                  {financialInfo.profitBeforeTax != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Profit Before Tax</p>
                      <p className="text-2xl font-bold">{fmtMoney(financialInfo.profitBeforeTax)}</p>
                    </div>
                  )}
                  {financialInfo.totalIncome != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Income</p>
                      <p className="text-2xl font-bold">{fmtMoney(financialInfo.totalIncome)}</p>
                    </div>
                  )}
                  {financialInfo.totalSelfEmploymentIncome != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">SE Income</p>
                      <p className="text-2xl font-bold">{fmtMoney(financialInfo.totalSelfEmploymentIncome)}</p>
                    </div>
                  )}
                  {financialInfo.totalProfitFromSelfEmployments != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">SE Profit</p>
                      <p className="text-2xl font-bold">{fmtMoney(financialInfo.totalProfitFromSelfEmployments)}</p>
                    </div>
                  )}
                  {financialInfo.avgEmployees != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Avg Employees</p>
                      <p className="text-2xl font-bold">{financialInfo.avgEmployees}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No financial data available for this client.</p>
                  <p className="text-sm mt-1">Use the Edit button above to add financial information.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax References Tab */}
        <TabsContent value="tax" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle>Tax & Registration</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setEditTaxRefOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />Edit
              </Button>
            </CardHeader>
            <CardContent>
              {taxReference ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
                  {taxReference.utr && <div><p className="text-sm font-medium text-muted-foreground mb-1">UTR</p><p className="font-mono text-sm">{taxReference.utr}</p></div>}
                  {taxReference.companyRegNo && <div><p className="text-sm font-medium text-muted-foreground mb-1">Company Reg</p><p className="font-mono text-sm">{taxReference.companyRegNo}</p></div>}
                  {taxReference.vatRegNo && <div><p className="text-sm font-medium text-muted-foreground mb-1">VAT Number</p><p className="font-mono text-sm">{taxReference.vatRegNo}</p></div>}
                  {taxReference.payeRef && <div><p className="text-sm font-medium text-muted-foreground mb-1">PAYE Ref</p><p className="font-mono text-sm">{taxReference.payeRef}</p></div>}
                  {taxReference.payeAccountsOfficeRef && <div><p className="text-sm font-medium text-muted-foreground mb-1">PAYE A/O Ref</p><p className="font-mono text-sm">{taxReference.payeAccountsOfficeRef}</p></div>}
                  {taxReference.niNumber && <div><p className="text-sm font-medium text-muted-foreground mb-1">NI Number</p><p className="font-mono text-sm">{taxReference.niNumber}</p></div>}
                  {taxReference.taxOffice && <div><p className="text-sm font-medium text-muted-foreground mb-1">Tax Office</p><p className="text-sm">{taxReference.taxOffice}</p></div>}
                  {taxReference.vatRegDate && <div><p className="text-sm font-medium text-muted-foreground mb-1">VAT Reg Date</p><p className="text-sm">{taxReference.vatRegDate}</p></div>}
                  {taxReference.amlStatus && <div><p className="text-sm font-medium text-muted-foreground mb-1">AML Status</p><Badge variant={taxReference.amlStatus === "Complete" ? "default" : "secondary"}>{taxReference.amlStatus}</Badge></div>}
                  {taxReference.engagementStatus && <div><p className="text-sm font-medium text-muted-foreground mb-1">Engagement</p><Badge variant="outline">{taxReference.engagementStatus}</Badge></div>}
                  {taxReference.latestAccountsStatus && <div><p className="text-sm font-medium text-muted-foreground mb-1">Latest Accounts</p><Badge variant="secondary">{taxReference.latestAccountsStatus}</Badge></div>}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tax references available.</p>
                  <p className="text-sm mt-1">Use the Edit button above to add tax details.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SA Returns Tab */}
        <TabsContent value="sa" className="mt-4 space-y-4">
          {saReturns.length === 0 ? (
            <Card>
              <CardContent className="text-center py-10 text-muted-foreground">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                <p>No SA return data found for this client.</p>
                <p className="text-sm mt-1">SA return data is populated from the TaxCalc import.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {[
                { type: "personal", label: "Personal Tax", returns: personalReturns },
                { type: "trust", label: "Trust Tax", returns: trustReturns },
                { type: "partnership", label: "Partnership Tax", returns: partnershipReturns },
              ].filter(g => g.returns.length > 0).map((group) => (
                <Card key={group.type}>
                  <CardHeader>
                    <CardTitle className="text-base">{group.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {group.returns.map((sa) => (
                        <div key={sa.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 border rounded-lg px-4 py-3">
                          <span className="font-mono font-bold text-sm w-14 shrink-0">{sa.taxYear}/{String(Number(sa.taxYear) + 1).slice(-2)}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${saStatusColor(sa.returnStatus)}`}>
                            {sa.returnStatus ?? "No status"}
                          </span>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground flex-1">
                            {sa.totalIncome != null && <span>Income: {fmtMoney(sa.totalIncome)}</span>}
                            {sa.totalTaxDue != null && <span>Tax: {fmtMoney(sa.totalTaxDue)}</span>}
                            {sa.hasRepayment && <span className="text-emerald-600">Repayment: {fmtMoney(sa.repaymentAmount)}</span>}
                            {sa.hasCapitalGains && <span>CG: {fmtMoney(sa.totalCapitalGains)}</span>}
                            {sa.dateFiledToHmrc && <span>Filed: {sa.dateFiledToHmrc}</span>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {sa.returnFiledSuccessfully && <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">Filed ✓</Badge>}
                            {sa.returnLocked && <Badge variant="outline" className="text-xs">Locked</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* CT Return Tab */}
        <TabsContent value="ct" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Corporation Tax Return</CardTitle>
              <CardDescription>Latest CT period data from TaxCalc</CardDescription>
            </CardHeader>
            <CardContent>
              {latestCt ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-8 text-sm">
                  {latestCt.ctPeriodStart && <div><p className="font-medium text-muted-foreground mb-0.5">Period</p><p>{latestCt.ctPeriodStart} → {latestCt.ctPeriodEnd ?? "—"}</p></div>}
                  {latestCt.ctPaymentDeadline && <div><p className="font-medium text-muted-foreground mb-0.5">Payment Deadline</p><p>{latestCt.ctPaymentDeadline}</p></div>}
                  {latestCt.companyTurnover != null && <div><p className="font-medium text-muted-foreground mb-0.5">Turnover</p><p className="font-bold">{fmtMoney(latestCt.companyTurnover)}</p></div>}
                  {latestCt.tradingProfits != null && <div><p className="font-medium text-muted-foreground mb-0.5">Trading Profits</p><p className="font-bold">{fmtMoney(latestCt.tradingProfits)}</p></div>}
                  {latestCt.profitsChargeableToCt != null && <div><p className="font-medium text-muted-foreground mb-0.5">Chargeable Profits</p><p className="font-bold">{fmtMoney(latestCt.profitsChargeableToCt)}</p></div>}
                  {latestCt.corporationTax != null && <div><p className="font-medium text-muted-foreground mb-0.5">Corporation Tax</p><p className="font-bold">{fmtMoney(latestCt.corporationTax)}</p></div>}
                  {latestCt.corporationTaxOutstanding != null && <div><p className="font-medium text-muted-foreground mb-0.5">CT Outstanding</p><p className="font-bold text-amber-600">{fmtMoney(latestCt.corporationTaxOutstanding)}</p></div>}
                  {latestCt.corporationTaxOverpaid != null && <div><p className="font-medium text-muted-foreground mb-0.5">CT Overpaid</p><p className="font-bold text-emerald-600">{fmtMoney(latestCt.corporationTaxOverpaid)}</p></div>}
                  <div><p className="font-medium text-muted-foreground mb-0.5">Return Filed</p><p>{fmtBool(latestCt.returnFiledSuccessfully)}</p></div>
                  {latestCt.hasRepayment && <div><p className="font-medium text-muted-foreground mb-0.5">Has Repayment</p><Badge variant="outline" className="text-emerald-600 border-emerald-300">Yes</Badge></div>}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No CT return data available.</p>
                  <p className="text-sm mt-1">CT return data is populated from the TaxCalc import.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Period Tab */}
        <TabsContent value="accounts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Accounting Periods</CardTitle>
              <CardDescription>Accounts filing status from TaxCalc</CardDescription>
            </CardHeader>
            <CardContent>
              {accountsPeriods.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No accounts period data available.</p>
                  <p className="text-sm mt-1">Accounts data is populated from the TaxCalc import.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accountsPeriods.map((ap) => (
                    <div key={ap.id} className="border rounded-lg px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {ap.periodStart ?? "Unknown"} → {ap.periodEnd ?? "Unknown"}
                        </span>
                        {ap.accountsStatus && (
                          <Badge variant="secondary">{ap.accountsStatus}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                        {ap.accountingStandard && <span>Standard: {ap.accountingStandard}</span>}
                        {ap.averageEmployees != null && <span>Avg employees: {ap.averageEmployees}</span>}
                        {ap.periodLocked && <span className="text-amber-600">Period locked</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PoundSterling className="h-5 w-5" />
                Fee Schedule
              </CardTitle>
              <CardDescription>Service fees from TaxCalc</CardDescription>
            </CardHeader>
            <CardContent>
              {fees ? (
                <div className="space-y-4">
                  {feeRows.length > 0 ? (
                    <div className="rounded-md border divide-y">
                      {feeRows.map((row) => (
                        <div key={row.label} className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="font-medium">{row.label}</span>
                          <div className="flex items-center gap-3">
                            {row.flag === true && <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">Active</Badge>}
                            <span className="font-mono font-medium">{row.fee ? fmtMoney(row.fee) : "—"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No active fee lines on record.</p>
                  )}
                  {fees.totalFee && (
                    <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg">
                      <span className="font-semibold">Total Fee</span>
                      <span className="font-mono font-bold text-lg">{fmtMoney(fees.totalFee)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p>No fee schedule data available.</p>
                  <p className="text-sm mt-1">Fee data is populated from the TaxCalc import.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle>Client Tasks</CardTitle>
              <Button size="sm" onClick={() => setCreateTaskOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </CardHeader>
            <CardContent>
              {tasks && tasks.length > 0 ? (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.taskName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {task.activityType && <span>{task.activityType}</span>}
                          {task.dueDate && (
                            <span className={`flex items-center gap-1 ${task.isOverdue ? "text-destructive font-medium" : ""}`}>
                              <Clock className="w-3 h-3" />
                              {format(new Date(task.dueDate), "MMM d, yyyy")}
                            </span>
                          )}
                          {task.assignedTo && <span>Assigned: {task.assignedTo}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {task.isOverdue && <Badge variant="destructive" className="hidden sm:inline-flex">Overdue</Badge>}
                        <Select value={task.taskStatus} onValueChange={(val) => handleTaskStatusChange(task.id, val)}>
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {taskStatuses.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditTask(task)}>
                              <Pencil className="mr-2 h-4 w-4" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTask(task)}>
                              <Trash2 className="mr-2 h-4 w-4" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p>No tasks for this client.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateTaskOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />Add Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ClientFormDialog open={editClientOpen} onOpenChange={setEditClientOpen} client={client} />

      <DeleteConfirmDialog
        open={deleteClientOpen}
        onOpenChange={setDeleteClientOpen}
        title="Delete Client"
        description={`Are you sure you want to delete "${client.name}"? All associated data will also be removed. This action cannot be undone.`}
        onConfirm={handleDeleteClient}
        isLoading={deleteClientMutation.isPending}
      />

      <TaskFormDialog
        open={createTaskOpen || !!editTask}
        onOpenChange={(o) => { if (!o) { setCreateTaskOpen(false); setEditTask(null); } }}
        clientId={id}
        clientName={client.name}
        task={editTask}
      />

      <DeleteConfirmDialog
        open={!!deleteTask}
        onOpenChange={(o) => { if (!o) setDeleteTask(null); }}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteTask?.taskName}"? This action cannot be undone.`}
        onConfirm={handleDeleteTask}
        isLoading={deleteTaskMutation.isPending}
      />

      <FinancialInfoEditDialog
        open={editFinancialOpen}
        onOpenChange={setEditFinancialOpen}
        clientId={id}
        financialInfo={financialInfo ?? null}
      />

      <TaxReferenceEditDialog
        open={editTaxRefOpen}
        onOpenChange={setEditTaxRefOpen}
        clientId={id}
        taxReference={taxReference ?? null}
      />
    </div>
  );
}
