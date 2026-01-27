import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
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
  
  console.log(`Running migrations from: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("Migrations completed successfully");
}