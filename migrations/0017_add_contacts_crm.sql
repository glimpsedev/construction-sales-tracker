-- Create enums for contacts CRM
CREATE TYPE "public"."company_type" AS ENUM('contractor', 'owner', 'architect', 'agency', 'vendor', 'subcontractor', 'other');--> statement-breakpoint
CREATE TYPE "public"."contact_source" AS ENUM('vcf_import', 'manual', 'dodge_import');--> statement-breakpoint
CREATE TYPE "public"."contact_job_role" AS ENUM('contractor', 'owner', 'architect', 'construction_manager', 'ordered_by', 'office_contact', 'other');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('call', 'email', 'meeting', 'site_visit', 'text', 'note');--> statement-breakpoint
CREATE TYPE "public"."interaction_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint

-- Create companies table
CREATE TABLE "companies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"normalized_name" text,
	"phone" text,
	"email" text,
	"website" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"county" text,
	"type" "company_type" DEFAULT 'other',
	"license_number" text,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"notes" text,
	"last_interaction_at" timestamp,
	"last_interaction_type" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

-- Create contacts table
CREATE TABLE "contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"company_id" varchar,
	"first_name" text,
	"last_name" text,
	"full_name" text,
	"title" text,
	"role" text,
	"phone_primary" text,
	"phone_cell" text,
	"phone_work" text,
	"phone_fax" text,
	"email_primary" text,
	"email_secondary" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"source" "contact_source" DEFAULT 'manual',
	"notes" text,
	"last_interaction_at" timestamp,
	"last_interaction_type" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);--> statement-breakpoint

-- Create contact_jobs junction table
CREATE TABLE "contact_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar NOT NULL,
	"job_id" varchar NOT NULL,
	"role" "contact_job_role" DEFAULT 'other',
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint

-- Create interactions table
CREATE TABLE "interactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"contact_id" varchar,
	"company_id" varchar,
	"job_id" varchar,
	"type" "interaction_type" NOT NULL,
	"direction" "interaction_direction" DEFAULT 'outbound',
	"summary" text,
	"notes" text,
	"occurred_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_jobs" ADD CONSTRAINT "contact_jobs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_jobs" ADD CONSTRAINT "contact_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE set null ON UPDATE no action;
