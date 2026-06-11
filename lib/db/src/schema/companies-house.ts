import { pgTable, serial, integer, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";

export const companiesHouseTable = pgTable("companies_house", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().unique().references(() => clientsTable.id, { onDelete: "cascade" }),
  // Annual accounts / confirmation
  aa01: boolean("aa01"),
  aa02: boolean("aa02"),
  aa03: boolean("aa03"),
  aa06: boolean("aa06"),
  // Address changes
  ad01: text("ad01"),
  ad03: boolean("ad03"),
  ad04: boolean("ad04"),
  ad05: text("ad05"),
  // Director/officer appointments
  ap01: boolean("ap01"),
  ap02: boolean("ap02"),
  ap03: boolean("ap03"),
  ap04: boolean("ap04"),
  // Director changes
  ch01: boolean("ch01"),
  ch02: boolean("ch02"),
  ch03: boolean("ch03"),
  ch04: boolean("ch04"),
  // Confirmation statement
  cs01: text("cs01"),
  // Other filings
  em01: text("em01"),
  // Name changes
  nm01: boolean("nm01"),
  nm02: boolean("nm02"),
  nm03: boolean("nm03"),
  nm04: boolean("nm04"),
  // PSC filings
  psc01: boolean("psc01"),
  psc02: boolean("psc02"),
  psc04: boolean("psc04"),
  psc05: boolean("psc05"),
  psc07: boolean("psc07"),
  psc08: boolean("psc08"),
  psc09: boolean("psc09"),
  // Shares
  sh01: text("sh01"),
  // Terminations
  tm01: boolean("tm01"),
  tm02: boolean("tm02"),
  // VS01
  vs01SubmissionDeadline: text("vs01_submission_deadline"),
  // MTD relationship
  relationshipClientCode: text("relationship_client_code"),
  // MTD quarterly statuses 2026
  mtd2026Q1: text("mtd_2026_q1"),
  mtd2026Q2: text("mtd_2026_q2"),
  mtd2026Q3: text("mtd_2026_q3"),
  mtd2026Q4: text("mtd_2026_q4"),
  // MTD quarterly statuses 2027
  mtd2027Q1: text("mtd_2027_q1"),
  mtd2027Q2: text("mtd_2027_q2"),
  mtd2027Q3: text("mtd_2027_q3"),
  mtd2027Q4: text("mtd_2027_q4"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCompaniesHouseSchema = createInsertSchema(companiesHouseTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCompaniesHouse = z.infer<typeof insertCompaniesHouseSchema>;
export type CompaniesHouse = typeof companiesHouseTable.$inferSelect;
