import { pgTable, text, serial, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clientsTable.id, { onDelete: "set null" }),
  clientName: text("client_name").notNull(),
  activityType: text("activity_type"),
  assignedTo: text("assigned_to"),
  taskName: text("task_name").notNull(),
  taskStatus: text("task_status").notNull().default("Planned"),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
