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
import { CreatableCombobox } from "@/components/creatable-combobox";
import {
  useCreateTask,
  useUpdateTask,
  getListTasksQueryKey,
  getGetClientQueryKey,
  useListDropdownOptions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ACTIVITY_TYPES = [
  "Annual Accounts",
  "VAT Return",
  "Self Assessment",
  "Corporation Tax",
  "Payroll",
  "Bookkeeping",
  "Management Accounts",
  "Other",
];

const TASK_STATUSES = ["Planned", "In Progress", "Complete"];

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: number | null;
  clientName?: string | null;
  task?: {
    id: number;
    taskName: string;
    taskStatus: string;
    activityType?: string | null;
    assignedTo?: string | null;
    dueDate?: string | null;
    clientId?: number | null;
    clientName?: string | null;
  } | null;
}

const empty = {
  taskName: "",
  taskStatus: "Planned",
  activityType: "",
  assignedTo: "",
  dueDate: "",
};

export function TaskFormDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  task,
}: TaskFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = !!task;
  const { data: taskStatusData } = useListDropdownOptions({ category: "task_status" });
  const taskStatusOptions = taskStatusData?.options.map((o) => o.value) ?? TASK_STATUSES;
  const { data: activityTypeData } = useListDropdownOptions({ category: "activity_type" });
  const activityTypeOptions = activityTypeData?.options.map((o) => o.value) ?? ACTIVITY_TYPES;

  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          taskName: task.taskName ?? "",
          taskStatus: task.taskStatus ?? "Planned",
          activityType: task.activityType ?? "",
          assignedTo: task.assignedTo ?? "",
          dueDate: task.dueDate ?? "",
        });
      } else {
        setForm(empty);
      }
      setErrors({});
    }
  }, [open, task]);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isPending = createTask.isPending || updateTask.isPending;

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.taskName.trim()) e.taskName = "Task name is required";
    if (!form.taskStatus) e.taskStatus = "Status is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nullIfEmpty = (v: string) => v.trim() || null;

  const resolvedClientId = isEdit ? task?.clientId : clientId;
  const resolvedClientName = isEdit ? task?.clientName : clientName;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      taskName: form.taskName.trim(),
      taskStatus: form.taskStatus,
      activityType: nullIfEmpty(form.activityType),
      assignedTo: nullIfEmpty(form.assignedTo),
      dueDate: nullIfEmpty(form.dueDate),
      clientId: resolvedClientId ?? null,
      clientName: resolvedClientName ?? null,
    };

    if (isEdit && task) {
      updateTask.mutate(
        { id: task.id, data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            if (resolvedClientId) {
              queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(resolvedClientId) });
            }
            toast.success("Task updated successfully");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to update task"),
        }
      );
    } else {
      createTask.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
            if (resolvedClientId) {
              queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(resolvedClientId) });
            }
            toast.success("Task created successfully");
            onOpenChange(false);
          },
          onError: () => toast.error("Failed to create task"),
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Task" : "New Task"}
            {resolvedClientName && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                for {resolvedClientName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="taskName">Task Name *</Label>
            <Input
              id="taskName"
              value={form.taskName}
              onChange={(e) => set("taskName", e.target.value)}
              placeholder="e.g. Annual Accounts 2024"
            />
            {errors.taskName && <p className="text-xs text-destructive">{errors.taskName}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="taskStatus">Status *</Label>
              <CreatableCombobox
                id="taskStatus"
                value={form.taskStatus}
                onChange={(v) => set("taskStatus", v)}
                options={taskStatusOptions}
                placeholder="Select status..."
              />
              {errors.taskStatus && <p className="text-xs text-destructive">{errors.taskStatus}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="activityType">Activity Type</Label>
              <CreatableCombobox
                id="activityType"
                value={form.activityType}
                onChange={(v) => set("activityType", v)}
                options={activityTypeOptions}
                placeholder="Select or type..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Input
                id="assignedTo"
                value={form.assignedTo}
                onChange={(e) => set("assignedTo", e.target.value)}
                placeholder="Name or team"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
