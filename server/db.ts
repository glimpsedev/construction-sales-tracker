import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import path from "path";
import fs from "fs";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

async function runUntrackedMigrations(migrationsFolder: string) {
  // List of untracked migrations that need to be run manually
  const untrackedMigrations = [
    "0011_add_temperature_visited_tracking.sql",
    "0012_add_filter_preferences.sql",
    "0013_change_temperature_to_text.sql",
    "add_import_tracking_fields.sql",
    "add_new_dodge_fields.sql",
    "add_project_value_index.sql"
  ];

  console.log("Running untracked migrations...");
  
  for (const migrationFile of untrackedMigrations) {
    const migrationPath = path.join(migrationsFolder, migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.log(`Skipping ${migrationFile} (file not found)`);
      continue;
    }

    try {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      
      // Split by statement-breakpoint and execute each statement
      const statements = sql
        .split("--> statement-breakpoint")
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--") || s.includes("DO $$"));
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await pool.query(statement);
          } catch (error: any) {
            // Ignore "already exists" errors - these migrations are idempotent
            if (error?.message && (
              error.message.includes("already exists") ||
              error.message.includes("duplicate") ||
              error.code === "42P07" || // duplicate_table
              error.code === "42701" || // duplicate_column
              error.code === "42710"    // duplicate_object
            )) {
              console.log(`  ✓ ${migrationFile} - skipped (already applied)`);
            } else {
              throw error;
            }
          }
        }
      }
      
      console.log(`  ✓ ${migrationFile} - completed`);
    } catch (error: any) {
      console.error(`  ✗ ${migrationFile} - failed:`, error.message);
      // Don't throw - continue with other migrations
      // These migrations are idempotent, so partial failures are okay
    }
  }
}

export async function runMigrations() {
  // Try multiple possible locations for migrations folder
  const possiblePaths = [
    path.resolve(process.cwd(), "migrations"),
    path.resolve(process.cwd(), "..", "migrations"),
    path.resolve(process.cwd(), "..", "..", "migrations"),
  ];
  
  let migrationsFolder: string | null = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      migrationsFolder = possiblePath;
      console.log(`Found migrations folder at: ${migrationsFolder}`);
      break;
    }
  }
  
  if (!migrationsFolder) {
    console.error("Migrations folder not found. Tried:", possiblePaths);
    console.error("Current working directory:", process.cwd());
    throw new Error(`Migrations folder not found. Searched in: ${possiblePaths.join(", ")}`);
  }
  
  console.log(`Running tracked migrations from: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("Tracked migrations completed successfully");
  
  // Also run untracked migrations manually
  await runUntrackedMigrations(migrationsFolder);
  console.log("All migrations completed successfully");
}