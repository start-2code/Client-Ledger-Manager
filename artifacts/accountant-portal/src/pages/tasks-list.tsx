import React, { useState } from "react";
import { Link } from "wouter";
import {
  useListTasks,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckSquare, Clock, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { toast } from "sonner";

type TaskRow = {
  id: number;
  taskName: string;
  taskStatus: string;
  activityType?: string | null;
  assignedTo?: string | null;
  dueDate?: string | null;
  clientId?: number | null;
  clientName?: string | null;
  isOverdue?: boolean;
};

export default function TasksList() {
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskRow | null>(null);
  const [deleteTask, setDeleteTask] = useState<TaskRow | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useListTasks({
    status: status !== "all" ? status : undefined,
    page,
    limit: 50,
  });

  const updateTask = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateTask.mutate(
      { id: taskId, data: { taskStatus: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTask) return;
    deleteTaskMutation.mutate(
      { id: deleteTask.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast.success("Task deleted");
          setDeleteTask(null);
        },
        onError: () => toast.error("Failed to delete task"),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage ongoing and planned work.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      <div className="flex bg-card p-4 rounded-lg border shadow-sm items-center gap-4">
        <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Planned">Planned</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Complete">Complete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-[180px]">Status</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[140px]" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : data?.tasks && data.tasks.length > 0 ? (
              data.tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.taskName}</TableCell>
                  <TableCell>
                    {task.clientId ? (
                      <Link href={`/clients/${task.clientId}`} className="hover:underline text-primary">
                        {task.clientName}
                      </Link>
                    ) : (
                      task.clientName || '-'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{task.activityType || '-'}</TableCell>
                  <TableCell>
                    {task.dueDate ? (
                      <div className="flex items-center gap-2 text-sm">
                        <span className={task.isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                          {format(new Date(task.dueDate), 'MMM d, yyyy')}
                        </span>
                        {task.isOverdue && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Overdue</Badge>}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.taskStatus}
                      onValueChange={(val) => handleStatusChange(task.id, val)}
                      disabled={updateTask.isPending}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Planned">Planned</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Complete">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTask(task as TaskRow)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTask(task as TaskRow)}
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
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <CheckSquare className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
                  <p>No tasks found.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {data && data.total > 0 && (
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, data.total)} of {data.total} tasks
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page * 50 >= data.total} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <TaskFormDialog
        open={createOpen || !!editTask}
        onOpenChange={(o) => {
          if (!o) { setCreateOpen(false); setEditTask(null); }
        }}
        task={editTask}
      />

      <DeleteConfirmDialog
        open={!!deleteTask}
        onOpenChange={(o) => { if (!o) setDeleteTask(null); }}
        title="Delete Task"
        description={`Are you sure you want to delete "${deleteTask?.taskName}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        isLoading={deleteTaskMutation.isPending}
      />
    </div>
  );
}
