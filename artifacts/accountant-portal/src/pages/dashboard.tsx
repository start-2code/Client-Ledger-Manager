import React from "react";
import { Link } from "wouter";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  FileWarning, 
  ArrowRight,
  PieChart,
  Activity
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  useGetDashboardSummary, 
  useGetDashboardOverdueTasks,
} from "@workspace/api-client-react";

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: overdueTasks, isLoading: isTasksLoading } = useGetDashboardOverdueTasks({ limit: 5 });

  if (isSummaryLoading || isTasksLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your practice's performance and outstanding work.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.activeClientsCount} active engagements
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.overdueTasksCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VAT Registered</CardTitle>
            <FileWarning className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.vatRegisteredCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clients registered for VAT
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Overdue Tasks</CardTitle>
            <CardDescription>
              Tasks that have passed their due date
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overdueTasks && overdueTasks.length > 0 ? (
              <div className="space-y-4">
                {overdueTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-white">{task.taskName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.clientName} &middot; {task.activityType}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="hidden sm:inline-flex">Overdue</Badge>
                      <Link href={`/clients/${task.clientId}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                <p>No overdue tasks.</p>
              </div>
            )}
            <div className="mt-4">
              <Link href="/tasks">
                <Button variant="ghost" className="w-full text-primary">
                  View All Tasks <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>SA Returns Status</CardTitle>
            <CardDescription>Self Assessment progress</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {summary.taxReturnsByStatus?.map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      stat.label.includes('Filed') ? 'bg-emerald-500' : 
                      stat.label.includes('Progress') ? 'bg-amber-500' : 'bg-slate-300'
                    }`} />
                    <span className="text-sm font-medium">{stat.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">{stat.count}</span>
                </div>
              ))}
              {(!summary.taxReturnsByStatus || summary.taxReturnsByStatus.length === 0) && (
                <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
