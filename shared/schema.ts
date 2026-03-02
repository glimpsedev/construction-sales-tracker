import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean, json, pgEnum, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const jobStatusEnum = pgEnum("job_status", ["active", "completed", "planning", "pending"]);
export const jobTypeEnum = pgEnum("job_type", ["commercial", "residential", "industrial", "equipment", "other", "office"]);
export const equipmentStatusEnum = pgEnum("equipment_status", ["starting", "stopping", "maintenance"]);
export const rentalStatusEnum = pgEnum("rental_status", ["on_rent", "off_rent", "maintenance"]);
export const jobTemperatureEnum = pgEnum("job_temperature", ["hot", "warm", "cold", "green"]);
export const companyTypeEnum = pgEnum("company_type", ["contractor", "owner", "architect", "agency", "vendor", "subcontractor", "other"]);
export const contactSourceEnum = pgEnum("contact_source", ["vcf_import", "manual", "dodge_import", "kyc_import"]);
export const contactJobRoleEnum = pgEnum("contact_job_role", ["contractor", "owner", "architect", "construction_manager", "ordered_by", "office_contact", "other"]);
export const interactionTypeEnum = pgEnum("interaction_type", ["call", "email", "meeting", "site_visit", "text", "note"]);
export const interactionDirectionEnum = pgEnum("interaction_direction", ["inbound", "outbound"]);

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
  serialNumber: text("serial_number"),
  year: text("year"),
  specs: text("specs"),
  customer: text("customer").notNull(),
  customerOnRent: text("customer_on_rent"),
  acctMgr: text("acct_mgr"),
  location: text("location"),
  dateOnOffRent: text("date_on_off_rent"),
  daysOnOffRent: integer("days_on_off_rent"),
  monthlyRate: integer("monthly_rate"),
  status: rentalStatusEnum("status").notNull().default("on_rent"),
  notes: text("notes"),
  emailProcessedAt: timestamp("email_processed_at").defaultNow(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull()
});

// Companies table - canonical company records, deduplicated
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  county: text("county"),
  type: companyTypeEnum("type").default("other"),
  licenseNumber: text("license_number"),
  tags: json("tags").$type<string[]>().default([]).notNull(),
  notes: text("notes"),
  lastInteractionAt: timestamp("last_interaction_at"),
  lastInteractionType: text("last_interaction_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contacts table - individual people, linked to a company
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "set null" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  fullName: text("full_name"),
  title: text("title"),
  role: text("role"),
  phonePrimary: text("phone_primary"),
  phoneCell: text("phone_cell"),
  phoneWork: text("phone_work"),
  phoneFax: text("phone_fax"),
  emailPrimary: text("email_primary"),
  emailSecondary: text("email_secondary"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  tags: json("tags").$type<string[]>().default([]).notNull(),
  source: contactSourceEnum("source").default("manual"),
  notes: text("notes"),
  lastInteractionAt: timestamp("last_interaction_at"),
  lastInteractionType: text("last_interaction_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contact-jobs junction table - many-to-many between contacts and jobs
export const contactJobs = pgTable("contact_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: varchar("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  role: contactJobRoleEnum("role").default("other"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Interactions table - activity log for CRM tracking
export const interactions = pgTable("interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").references(() => jobs.id, { onDelete: "set null" }),
  type: interactionTypeEnum("type").notNull(),
  direction: interactionDirectionEnum("direction").default("outbound"),
  summary: text("summary"),
  notes: text("notes"),
  occurredAt: timestamp("occurred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobsRelations = relations(jobs, ({ many }) => ({
  equipment: many(equipment),
  contactJobs: many(contactJobs),
}));

export const equipmentRelations = relations(equipment, ({ one }) => ({
  job: one(jobs, {
    fields: [equipment.jobId],
    references: [jobs.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  contactJobs: many(contactJobs),
  interactions: many(interactions),
}));

export const contactJobsRelations = relations(contactJobs, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactJobs.contactId],
    references: [contacts.id],
  }),
  job: one(jobs, {
    fields: [contactJobs.jobId],
    references: [jobs.id],
  }),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  contact: one(contacts, {
    fields: [interactions.contactId],
    references: [contacts.id],
  }),
  company: one(companies, {
    fields: [interactions.companyId],
    references: [companies.id],
  }),
  job: one(jobs, {
    fields: [interactions.jobId],
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

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContactJobSchema = createInsertSchema(contactJobs).omit({
  id: true,
  createdAt: true,
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
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
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type ContactJob = typeof contactJobs.$inferSelect;
export type InsertContactJob = z.infer<typeof insertContactJobSchema>;
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;

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
