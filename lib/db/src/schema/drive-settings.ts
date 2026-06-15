import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const driveSettingsTable = pgTable("drive_settings", {
  id: serial("id").primaryKey(),
  rootFolderName: text("root_folder_name").notNull().default("ClearBooks Clients"),
  rootFolderId: text("root_folder_id"),
  oauthRefreshToken: text("oauth_refresh_token"),
  oauthEmail: text("oauth_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type DriveSetting = typeof driveSettingsTable.$inferSelect;
