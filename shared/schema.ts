import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, json, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobStatusEnum = pgEnum("job_status", ["active", "completed", "planning", "pending"]);
export const jobTypeEnum = pgEnum("job_type", ["commercial", "residential", "industrial", "equipment", "other", "office"]);
export const equipmentStatusEnum = pgEnum("equipment_status", ["starting", "stopping", "maintenance"]);
export const rentalStatusEnum = pgEnum("rental_status", ["on_rent", "off_rent", "maintenance"]);
export const jobTemperatureEnum = pgEnum("job_temperature", ["hot", "warm", "cold", "green"]);

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // User who owns this job
  name: text("name").notNull(),
  address: text("address").notNull(),
  county: text("county"), // County information from Dodge Data
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  contractor: text("contractor"),
  contractorPhone: text("contractor_phone"),
  contractorAddress: text("contractor_address"),
  contractorCity: text("contractor_city"),
  contractorCounty: text("contractor_county"),
  contractorEmail: text("contractor_email"),
  contractorWebsite: text("contractor_website"),
  contractorContact: text("contractor_contact"),
  owner: text("owner"),
  ownerPhone: text("owner_phone"),
  constructionManager: text("construction_manager"),
  constructionManagerPhone: text("construction_manager_phone"),
  architect: text("architect"),
  projectValue: decimal("project_value", { precision: 12, scale: 2 }),
  projectUrl: text("project_url"),
  versionNumber: text("version_number"),
  projectNumber: text("project_number"),
  additionalFeatures: text("additional_features"),
  deliverySystem: text("delivery_system"),
  specsAvailable: text("specs_available"),
  workType: text("work_type"),
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
  // Additional fields for Dodge CSV import
  description: text("description"),
  phone: text("phone"),
  email: text("email"),
  // User interaction tracking
  isViewed: boolean("is_viewed").default(false), // Deprecated - use is_cold instead
  viewedAt: timestamp("viewed_at"), // Deprecated
  userNotes: text("user_notes").default(""),
  temperature: text("temperature"),
  isCold: boolean("is_cold").default(false).notNull(), // Manually marked as cold
  isFavorite: boolean("is_favorite").default(false).notNull(), // User's favorite jobs
  // Temperature-based visited tracking
  visited: boolean("visited").default(false).notNull(),
  temperatureSetAt: timestamp("temperature_set_at"),
  // Import tracking fields
  externalId: text("external_id"), // External ID from CSV
  dedupeKey: text("dedupe_key"), // Normalized key for deduplication
  lockedFields: json("locked_fields").$type<string[]>().default([]).notNull(), // Fields edited by user
  lastImportedAt: timestamp("last_imported_at") // Last time this job was imported/updated
});

export const equipment = pgTable("equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // User who owns this equipment
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
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  verified: boolean("verified").default(false).notNull(),
  filterPreferences: json("filter_preferences").$type<Record<string, FilterPreference>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailVerifications = pgTable("email_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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
  email: true,
  password: true,
});

export const insertEmailVerificationSchema = createInsertSchema(emailVerifications).omit({
  id: true,
  createdAt: true,
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
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type InsertEmailVerification = z.infer<typeof insertEmailVerificationSchema>;
export type RentalEquipment = typeof rentalEquipment.$inferSelect;
export type InsertRentalEquipment = z.infer<typeof insertRentalEquipmentSchema>;

// Filter preferences types
export interface FilterPreference {
  name: string;
  icon: string;
  color: string;
}

export type FilterPreferences = Record<string, FilterPreference>;

// Default filter preferences
export const DEFAULT_FILTER_PREFERENCES: FilterPreferences = {
  hot: {
    name: "Hot",
    icon: "",
    color: "#ef4444", // red-500
  },
  warm: {
    name: "Warm",
    icon: "",
    color: "#f97316", // orange-500
  },
  cold: {
    name: "Cold",
    icon: "",
    color: "#6b7280", // gray-500
  },
  green: {
    name: "Green",
    icon: "",
    color: "#22c55e", // green-500
  },
};
