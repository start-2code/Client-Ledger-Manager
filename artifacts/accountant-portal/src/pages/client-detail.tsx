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
  MoreHorizontal, Pencil, Trash2, Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ClientFormDialog } from "@/components/client-form-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { FinancialInfoEditDialog } from "@/components/financial-info-edit-dialog";
import { TaxReferenceEditDialog } from "@/components/tax-reference-edit-dialog";
import { toast } from "sonner";

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

  const { client, financialInfo, taxReference, taxReturn, tasks } = data;

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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto md:h-10 gap-2 md:gap-0">
          <TabsTrigger value="contact">Contact & Details</TabsTrigger>
          <TabsTrigger value="financial">Financials</TabsTrigger>
          <TabsTrigger value="tax">Tax References</TabsTrigger>
          <TabsTrigger value="sa">SA Return</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks?.length || 0})</TabsTrigger>
        </TabsList>

        {/* Contact Tab */}
        <TabsContent value="contact" className="mt-6 space-y-6">
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
                    <p className="text-sm text-muted-foreground">{client.email || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <p className="text-sm text-muted-foreground">{client.contactNumber || 'Not provided'}</p>
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
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financial" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Financial Information</CardTitle>
                <CardDescription>Latest available figures</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditFinancialOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              {financialInfo ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {financialInfo.turnover != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Turnover</p>
                      <p className="text-2xl font-bold">£{financialInfo.turnover?.toLocaleString()}</p>
                    </div>
                  )}
                  {financialInfo.profitBeforeTax != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Profit Before Tax</p>
                      <p className="text-2xl font-bold">£{financialInfo.profitBeforeTax?.toLocaleString()}</p>
                    </div>
                  )}
                  {financialInfo.totalIncome != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Income</p>
                      <p className="text-2xl font-bold">£{financialInfo.totalIncome?.toLocaleString()}</p>
                    </div>
                  )}
                  {financialInfo.totalSelfEmploymentIncome != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">SE Income</p>
                      <p className="text-2xl font-bold">£{financialInfo.totalSelfEmploymentIncome?.toLocaleString()}</p>
                    </div>
                  )}
                  {financialInfo.totalProfitFromSelfEmployments != null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">SE Profit</p>
                      <p className="text-2xl font-bold">£{financialInfo.totalProfitFromSelfEmployments?.toLocaleString()}</p>
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
        <TabsContent value="tax" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle>Tax & Registration</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setEditTaxRefOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </CardHeader>
            <CardContent>
              {taxReference ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
                  {taxReference.utr && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">UTR</p>
                      <p className="font-mono text-sm">{taxReference.utr}</p>
                    </div>
                  )}
                  {taxReference.companyRegNo && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Company Reg</p>
                      <p className="font-mono text-sm">{taxReference.companyRegNo}</p>
                    </div>
                  )}
                  {taxReference.vatRegNo && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">VAT Number</p>
                      <p className="font-mono text-sm">{taxReference.vatRegNo}</p>
                    </div>
                  )}
                  {taxReference.payeRef && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">PAYE Ref</p>
                      <p className="font-mono text-sm">{taxReference.payeRef}</p>
                    </div>
                  )}
                  {taxReference.payeAccountsOfficeRef && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">PAYE A/O Ref</p>
                      <p className="font-mono text-sm">{taxReference.payeAccountsOfficeRef}</p>
                    </div>
                  )}
                  {taxReference.niNumber && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">NI Number</p>
                      <p className="font-mono text-sm">{taxReference.niNumber}</p>
                    </div>
                  )}
                  {taxReference.taxOffice && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Tax Office</p>
                      <p className="text-sm">{taxReference.taxOffice}</p>
                    </div>
                  )}
                  {taxReference.vatRegDate && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">VAT Reg Date</p>
                      <p className="text-sm">{taxReference.vatRegDate}</p>
                    </div>
                  )}
                  {taxReference.dateOfIncorporation && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Incorporated</p>
                      <p className="text-sm">{taxReference.dateOfIncorporation}</p>
                    </div>
                  )}
                  {taxReference.amlStatus && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">AML Status</p>
                      <Badge variant={taxReference.amlStatus === 'Complete' ? 'default' : 'secondary'}>
                        {taxReference.amlStatus}
                      </Badge>
                    </div>
                  )}
                  {taxReference.engagementStatus && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Engagement</p>
                      <Badge variant="outline">{taxReference.engagementStatus}</Badge>
                    </div>
                  )}
                  {taxReference.latestAccountsStatus && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Latest Accounts</p>
                      <Badge variant="secondary">{taxReference.latestAccountsStatus}</Badge>
                    </div>
                  )}
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

        {/* SA Return Tab */}
        <TabsContent value="sa" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Self Assessment Status</CardTitle>
            </CardHeader>
            <CardContent>
              {taxReturn ? (
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    taxReturn.taxReturnStatus?.includes('Filed') ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {taxReturn.taxReturnStatus?.includes('Filed')
                      ? <CheckCircle2 className="w-6 h-6" />
                      : <Clock className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-medium text-lg">{taxReturn.taxReturnStatus || 'Status Unknown'}</p>
                    <p className="text-sm text-muted-foreground">Current Tax Year</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No SA return record found for this client.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
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
                    <div
                      key={task.id}
                      className="flex items-center justify-between border rounded-lg px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.taskName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          {task.activityType && <span>{task.activityType}</span>}
                          {task.dueDate && (
                            <span className={`flex items-center gap-1 ${task.isOverdue ? 'text-destructive font-medium' : ''}`}>
                              <Clock className="w-3 h-3" />
                              {format(new Date(task.dueDate), 'MMM d, yyyy')}
                            </span>
                          )}
                          {task.assignedTo && <span>Assigned: {task.assignedTo}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {task.isOverdue && <Badge variant="destructive" className="hidden sm:inline-flex">Overdue</Badge>}
                        <Select
                          value={task.taskStatus}
                          onValueChange={(val) => handleTaskStatusChange(task.id, val)}
                        >
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
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTask(task)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ClientFormDialog
        open={editClientOpen}
        onOpenChange={setEditClientOpen}
        client={client}
      />

      <DeleteConfirmDialog
        open={deleteClientOpen}
        onOpenChange={setDeleteClientOpen}
        title="Delete Client"
        description={`Are you sure you want to delete "${client.name}"? All associated data (tasks, financial info, tax references, tax returns) will also be removed. This action cannot be undone.`}
        onConfirm={handleDeleteClient}
        isLoading={deleteClientMutation.isPending}
      />

      <TaskFormDialog
        open={createTaskOpen || !!editTask}
        onOpenChange={(o) => {
          if (!o) { setCreateTaskOpen(false); setEditTask(null); }
        }}
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
