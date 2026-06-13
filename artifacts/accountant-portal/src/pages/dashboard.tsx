import React from "react";
import { Link } from "wouter";
import {
  Users,
  CheckCircle2,
  Clock,
  FileWarning,
  ArrowRight,
  AlertTriangle,
  Calendar,
  FileText,
  BarChart3,
  Building2,
  TrendingUp,
  Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useGetDashboardSummary,
  useGetDashboardOverdueTasks,
  useGetDashboardTimeline,
} from "@workspace/api-client-react";

function NoDataBadge({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
      <Info className="h-7 w-7 text-muted-foreground/40" />
      <p className="text-sm text-center">{message}</p>
    </div>
  );
}

function DeadlineBand({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className={`text-sm font-bold ${count > 0 ? "text-slate-900 dark:text-white" : "text-muted-foreground"}`}>
        {count}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: overdueTasks, isLoading: isTasksLoading } = useGetDashboardOverdueTasks({ limit: 5 });
  const { data: timeline, isLoading: isTimelineLoading } = useGetDashboardTimeline();

  const isLoading = isSummaryLoading || isTasksLoading || isTimelineLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const saByYear = timeline?.saByYear ?? [];
  const ctItems = timeline?.ctOutstanding.items ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your practice's performance and outstanding work.</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary.activeClientsCount} active engagements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.overdueTasksCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VAT Registered</CardTitle>
            <FileWarning className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.vatRegisteredCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Clients registered for VAT</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 1: Overdue Tasks + SA Returns Status ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Overdue Tasks</CardTitle>
            <CardDescription>Tasks that have passed their due date</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueTasks && overdueTasks.length > 0 ? (
              <div className="space-y-4">
                {overdueTasks.map((task) => (
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
          <CardDescription>Self Assessment overall progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {summary.taxReturnsByStatus?.map((stat, i) => (
              <Link key={i} href={`/tax-returns?status=${encodeURIComponent(stat.label)}`}>
                <div className="flex items-center justify-between cursor-pointer hover:opacity-75 transition-opacity p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      stat.label.includes("Filed") ? "bg-emerald-500" :
                      stat.label.includes("Progress") ? "bg-amber-500" : "bg-slate-300"
                    }`} />
                    <span className="text-sm font-medium text-primary hover:underline">{stat.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground font-mono">{stat.count}</span>
                </div>
              </Link>
            ))}
            {(!summary.taxReturnsByStatus || summary.taxReturnsByStatus.length === 0) && (
              <p className="text-sm text-muted-foreground py-4 text-center">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* ── Section heading ── */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Compliance Timeline</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Deadlines, outstanding returns, and engagement status across your client base.</p>
      </div>

      {/* ── Row 2: CT Deadlines + CT Outstanding ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 1. CT Payment Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                CT Payment Deadlines
              </CardTitle>
              <CardDescription className="mt-1">Upcoming Corporation Tax payments due</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {timeline && (
              timeline.ctDeadlines.within90 === 0 ? (
                <NoDataBadge message="No CT payment deadlines in the next 90 days" />
              ) : (
                <div className="space-y-3">
                  <DeadlineBand label="Due within 30 days" count={timeline.ctDeadlines.within30} color="bg-red-500" />
                  <DeadlineBand label="Due within 60 days" count={timeline.ctDeadlines.within60 - timeline.ctDeadlines.within30} color="bg-amber-500" />
                  <DeadlineBand label="Due within 90 days" count={timeline.ctDeadlines.within90 - timeline.ctDeadlines.within60} color="bg-yellow-400" />
                  <div className="border-t pt-3 mt-3 space-y-2 max-h-48 overflow-y-auto">
                    {timeline.ctDeadlines.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <Link href={`/clients/${item.clientId}`}>
                          <span className="text-primary hover:underline cursor-pointer">{item.clientName}</span>
                        </Link>
                        <span className="text-muted-foreground font-mono text-xs">{item.deadline}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* 3. CT Returns Outstanding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-red-500" />
                CT Returns Outstanding
              </CardTitle>
              <CardDescription className="mt-1">Period ended &gt;9 months ago — not yet filed</CardDescription>
            </div>
            {timeline && timeline.ctOutstanding.total > 0 && (
              <Badge variant="destructive" className="ml-auto">{timeline.ctOutstanding.total}</Badge>
            )}
          </CardHeader>
          <CardContent>
            {timeline && (
              timeline.ctOutstanding.total === 0 ? (
                <NoDataBadge message="No outstanding CT returns" />
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {ctItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div>
                        <Link href={`/clients/${item.clientId}`}>
                          <span className="text-primary hover:underline font-medium cursor-pointer">{item.clientName}</span>
                        </Link>
                        <p className="text-xs text-muted-foreground">Period end: {item.periodEnd}</p>
                      </div>
                      <Badge
                        variant={(item.monthsSinceEnd ?? 0) > 18 ? "destructive" : "outline"}
                        className="ml-2 shrink-0"
                      >
                        {item.monthsSinceEnd ?? 0}mo ago
                      </Badge>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Accounts Status + SA by Year ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 4. Accounts Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Accounts Status
            </CardTitle>
            <CardDescription>Submission status breakdown across all account periods</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline && timeline.accountsStatus.length === 0 ? (
              <NoDataBadge message="No accounts period data available" />
            ) : (
              <div className="space-y-3">
                {(timeline?.accountsStatus ?? [])
                  .filter((s) => s.status !== null)
                  .map((row, i) => {
                    const total = (timeline?.accountsStatus ?? []).reduce((acc, r) => acc + (r.count ?? 0), 0);
                    const pct = total > 0 ? Math.round(((row.count ?? 0) / total) * 100) : 0;
                    const colorMap: Record<string, string> = {
                      accepted: "bg-emerald-500",
                      No: "bg-slate-400",
                      Yes: "bg-blue-500",
                      rejected: "bg-red-500",
                      txnError: "bg-orange-500",
                      pending: "bg-amber-500",
                    };
                    const color = colorMap[row.status ?? ""] ?? "bg-slate-300";
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${color}`} />
                            <span className="capitalize">{row.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(row.overdueCount ?? 0) > 0 && (
                              <span className="text-xs text-destructive">{row.overdueCount} overdue</span>
                            )}
                            <span className="font-mono font-semibold">{row.count}</span>
                          </div>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                {(() => {
                  const nullRow = (timeline?.accountsStatus ?? []).find((s) => s.status === null);
                  if (!nullRow) return null;
                  const total = (timeline?.accountsStatus ?? []).reduce((acc, r) => acc + (r.count ?? 0), 0);
                  const pct = total > 0 ? Math.round(((nullRow.count ?? 0) / total) * 100) : 0;
                  return (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-200" />
                          <span className="text-muted-foreground italic">Not submitted</span>
                        </div>
                        <span className="font-mono font-semibold">{nullRow.count}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. SA Returns by Tax Year */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              SA Returns by Tax Year
            </CardTitle>
            <CardDescription>Filed vs outstanding Self Assessment returns</CardDescription>
          </CardHeader>
          <CardContent>
            {saByYear.length === 0 ? (
              <NoDataBadge message="No SA return data available" />
            ) : (
              <div className="space-y-4">
                {saByYear.slice(0, 5).map((row, i) => {
                  const filedPct = (row.total ?? 0) > 0 ? Math.round(((row.filed ?? 0) / (row.total ?? 1)) * 100) : 0;
                  const outstanding = (row.total ?? 0) - (row.filed ?? 0);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {row.taxYear}/{String(Number(row.taxYear) + 1).slice(-2)}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="text-emerald-600 font-medium">{row.filed} filed</span>
                          <span className="text-destructive font-medium">{outstanding} outstanding</span>
                          <span className="font-mono">{row.total} total</span>
                        </div>
                      </div>
                      <div className="relative">
                        <Progress value={filedPct} className="h-2" />
                        {filedPct < 5 && filedPct > 0 && (
                          <span className="absolute right-0 -top-5 text-xs text-muted-foreground">{filedPct}%</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              <Link href="/tax-returns">
                <Button variant="ghost" className="w-full text-primary">
                  View SA Returns <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Year Ends + Confirmation Statements + Task Timeline + Client Engagement ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 2. Year-End Clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-indigo-500" />
              Year-End Clients
            </CardTitle>
            <CardDescription className="text-xs">Clients with year-ends this/next month</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline?.yearEnds.hasData ? (
              <div className="space-y-3">
                <DeadlineBand label="This month" count={timeline.yearEnds.thisMonth} color="bg-indigo-500" />
                <DeadlineBand label="Next month" count={timeline.yearEnds.nextMonth} color="bg-indigo-300" />
              </div>
            ) : (
              <NoDataBadge message="Year-end dates not available in current import" />
            )}
          </CardContent>
        </Card>

        {/* 6. Confirmation Statements */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-teal-500" />
              Confirmation Statements
            </CardTitle>
            <CardDescription className="text-xs">Companies House filing deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline?.confirmationStatements.hasData ? (
              <div className="space-y-3">
                <DeadlineBand label="Due soon" count={timeline.confirmationStatements.dueSoon} color="bg-amber-500" />
                <DeadlineBand label="Overdue" count={timeline.confirmationStatements.overdue} color="bg-red-500" />
              </div>
            ) : (
              <NoDataBadge message="Confirmation statement dates not available in current import" />
            )}
          </CardContent>
        </Card>

        {/* 7. Tasks Timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-orange-500" />
              Tasks Timeline
            </CardTitle>
            <CardDescription className="text-xs">Tasks by due-date band</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline && (timeline.taskTimeline.overdue + timeline.taskTimeline.thisWeek + timeline.taskTimeline.nextWeek) > 0 ? (
              <div className="space-y-3">
                <DeadlineBand label="Overdue" count={timeline.taskTimeline.overdue} color="bg-red-500" />
                <DeadlineBand label="This week" count={timeline.taskTimeline.thisWeek} color="bg-amber-500" />
                <DeadlineBand label="Next week" count={timeline.taskTimeline.nextWeek} color="bg-blue-400" />
              </div>
            ) : (
              <NoDataBadge message="No task due dates in current data" />
            )}
          </CardContent>
        </Card>

        {/* 8. Client Engagement */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-rose-500" />
              Client Engagement
            </CardTitle>
            <CardDescription className="text-xs">Latest engagement date tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline?.clientEngagement.hasData ? (
              <div className="space-y-3">
                <div className="text-2xl font-bold text-destructive">
                  {timeline.clientEngagement.notEngagedCount}
                </div>
                <p className="text-xs text-muted-foreground">clients with no recent engagement recorded</p>
              </div>
            ) : (
              <NoDataBadge message="Engagement dates not available in current import" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
