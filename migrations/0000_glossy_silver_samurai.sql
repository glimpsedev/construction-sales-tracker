CREATE TYPE "public"."equipment_status" AS ENUM('starting', 'stopping', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('active', 'completed', 'planning', 'pending');--> statement-breakpoint
CREATE TYPE "public"."job_temperature" AS ENUM('hot', 'warm', 'cold');--> statement-breakpoint
CREATE TYPE "public"."job_type" AS ENUM('commercial', 'residential', 'industrial', 'equipment', 'other');--> statement-breakpoint
CREATE TYPE "public"."rental_status" AS ENUM('on_rent', 'off_rent', 'maintenance');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" text NOT NULL,
	"extracted_data" json,
	"processed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_verifications_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "equipment" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"job_id" varchar,
	"equipment_number" text NOT NULL,
	"attachment_type" text,
	"attachment_number" text,
	"status" "equipment_status" NOT NULL,
	"instructions" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"county" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"contractor" text,
	"owner" text,
	"architect" text,
	"project_value" numeric(12, 2),
	"status" "job_status" DEFAULT 'active' NOT NULL,
	"type" "job_type" DEFAULT 'commercial' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"last_updated" timestamp DEFAULT now(),
	"special_conditions" text,
	"ordered_by" text,
	"office_contact" text,
	"notes" text,
	"is_custom" boolean DEFAULT false,
	"dodge_job_id" text,
	"created_at" timestamp DEFAULT now(),
	"description" text,
	"phone" text,
	"email" text,
	"is_viewed" boolean DEFAULT false,
	"viewed_at" timestamp,
	"user_notes" text DEFAULT '',
	"temperature" "job_temperature"
);
--> statement-breakpoint
CREATE TABLE "rental_equipment" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_number" text NOT NULL,
	"model" text NOT NULL,
	"customer" text NOT NULL,
	"customer_on_rent" text,
	"acct_mgr" text,
	"location" text,
	"date_on_off_rent" text,
	"status" "rental_status" DEFAULT 'on_rent' NOT NULL,
	"notes" text,
	"email_processed_at" timestamp DEFAULT now(),
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;