import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const driveFolderTemplateTable = pgTable("drive_folder_template", {
  id: serial("id").primaryKey(),
  parentId: integer("parent_id"),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type DriveFolderTemplate = typeof driveFolderTemplateTable.$inferSelect;
