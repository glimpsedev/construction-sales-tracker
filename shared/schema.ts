import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, json, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobStatusEnum = pgEnum("job_status", ["active", "completed", "planning", "pending"]);
export const jobTypeEnum = pgEnum("job_type", ["commercial", "residential", "industrial", "equipment", "other"]);
export const equipmentStatusEnum = pgEnum("equipment_status", ["starting", "stopping", "maintenance"]);
export const rentalStatusEnum = pgEnum("rental_status", ["on_rent", "off_rent", "maintenance"]);

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  contractor: text("contractor"),
  projectValue: decimal("project_value", { precision: 12, scale: 2 }),
  status: jobStatusEnum("status").notNull().default("active"),
  type: jobTypeEnum("type").notNull().default("commercial"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  specialConditions: text("special_conditions"),
  orderedBy: text("ordered_by"),
  officeContact: text("office_contact"),
  notes: text("notes"),
  isCustom: boolean("is_custom").default(false),
  dodgeJobId: text("dodge_job_id"), // For tracking Dodge Data jobs
  createdAt: timestamp("created_at").defaultNow(),
});

export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: "cascade" }),
  equipmentNumber: text("equipment_number").notNull(),
  attachmentType: text("attachment_type"),
  attachmentNumber: text("attachment_number"),
  status: equipmentStatusEnum("status").notNull(),
  instructions: text("instructions"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: text("size").notNull(),
  extractedData: json("extracted_data"), // Addresses and equipment info
  processedAt: timestamp("processed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Equipment rental tracking table for daily email processing
export const rentalEquipment = pgTable("rental_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  equipmentNumber: text("equipment_number").notNull(),
  model: text("model").notNull(),
  customer: text("customer").notNull(), 
  customerOnRent: text("customer_on_rent"), // Customer currently renting
  acctMgr: text("acct_mgr"), // Account Manager (Hudson, etc.)
  location: text("location"),
  dateOnOffRent: text("date_on_off_rent"), // Date equipment went on/off rent
  status: rentalStatusEnum("status").notNull().default("on_rent"), // on_rent, off_rent, maintenance
  notes: text("notes"),
  emailProcessedAt: timestamp("email_processed_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

export const jobsRelations = relations(jobs, ({ many }) => ({
  equipment: many(equipment),
}));

export const equipmentRelations = relations(equipment, ({ one }) => ({
  job: one(jobs, {
    fields: [equipment.jobId],
    references: [jobs.id],
  }),
}));

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertEquipmentSchema = createInsertSchema(equipment).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRentalEquipmentSchema = createInsertSchema(rentalEquipment).omit({
  id: true,
  emailProcessedAt: true,
  lastUpdated: true,
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RentalEquipment = typeof rentalEquipment.$inferSelect;
export type InsertRentalEquipment = z.infer<typeof insertRentalEquipmentSchema>;
