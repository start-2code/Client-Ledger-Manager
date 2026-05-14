import React from "react";
import { useRoute, Link } from "wouter";
import { 
  useGetClient,
  useUpdateTask,
  getGetClientQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, FileText, CheckCircle2, Clock, AlertCircle, Building2, User, Users, Briefcase } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function ClientDetail() {
  const [, params] = useRoute("/clients/:id");
  const id = parseInt(params?.id || "0", 10);
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetClient(id, {
    query: {
      enabled: !!id,
      queryKey: getGetClientQueryKey(id)
    }
  });

  const updateTask = useUpdateTask();

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
    switch (clientType) {
      case "Limited Company": return <Building2 className="w-5 h-5" />;
      case "Individual": return <User className="w-5 h-5" />;
      case "Partnership": return <Users className="w-5 h-5" />;
      default: return <Briefcase className="w-5 h-5" />;
    }
  };

  const handleTaskStatusChange = (taskId: number, newStatus: string) => {
    updateTask.mutate({ id: taskId, data: { taskStatus: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(id) });
      }
    });
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
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              {client.name}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
              <span className="flex items-center gap-1">
                {getClientIcon(client.type)}
                {client.type}
              </span>
            </div>
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

        <TabsContent value="financial" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>Latest available figures</CardDescription>
            </CardHeader>
            <CardContent>
              {financialInfo ? (
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {financialInfo.turnover !== null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Turnover</p>
                      <p className="text-2xl font-bold">£{financialInfo.turnover?.toLocaleString()}</p>
                    </div>
                  )}
                  {financialInfo.profitBeforeTax !== null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Profit Before Tax</p>
                      <p className="text-2xl font-bold">£{financialInfo.profitBeforeTax?.toLocaleString()}</p>
                    </div>
                  )}
                  {financialInfo.avgEmployees !== null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Avg Employees</p>
                      <p className="text-2xl font-bold">{financialInfo.avgEmployees}</p>
                    </div>
                  )}
                  {financialInfo.totalIncome !== null && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Income</p>
                      <p className="text-2xl font-bold">£{financialInfo.totalIncome?.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No financial data available for this client.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tax & Registration</CardTitle>
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
                  {taxReference.niNumber && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">NI Number</p>
                      <p className="font-mono text-sm">{taxReference.niNumber}</p>
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
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No tax references available.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sa" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Self Assessment Status</CardTitle>
            </CardHeader>
            <CardContent>
              {taxReturn ? (
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    taxReturn.taxReturnStatus?.includes('Filed') ? 'bg-emerald-100 text-emerald-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {taxReturn.taxReturnStatus?.includes('Filed') ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
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

        <TabsContent value="tasks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks && tasks.length > 0 ? (
                <div className="space-y-4">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{task.taskName}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{task.activityType}</span>
                          {task.dueDate && (
                            <span className={`flex items-center gap-1 ${task.isOverdue ? 'text-destructive font-medium' : ''}`}>
                              <Clock className="w-3 h-3" />
                              {format(new Date(task.dueDate), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {task.isOverdue && <Badge variant="destructive">Overdue</Badge>}
                        <Select 
                          value={task.taskStatus} 
                          onValueChange={(val) => handleTaskStatusChange(task.id, val)}
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Planned">Planned</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Complete">Complete</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p>No outstanding tasks for this client.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
