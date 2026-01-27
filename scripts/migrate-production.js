// Standalone migration script for production
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import path from 'path';
import fs from 'fs';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Try multiple possible locations for migrations folder
const possiblePaths = [
  path.resolve(process.cwd(), 'migrations'),
  path.resolve(process.cwd(), '..', 'migrations'),
  path.resolve(process.cwd(), '..', '..', 'migrations'),
];

let migrationsFolder = null;
for (const possiblePath of possiblePaths) {
  if (fs.existsSync(possiblePath)) {
    migrationsFolder = possiblePath;
    console.log(`✅ Found migrations folder at: ${migrationsFolder}`);
    break;
  }
}

if (!migrationsFolder) {
  console.error('❌ Migrations folder not found. Tried:', possiblePaths);
  console.error('Current working directory:', process.cwd());
  process.exit(1);
}

console.log('🔄 Running migrations...');

try {
  const db = drizzle({ client: pool });
  await migrate(db, { migrationsFolder });
  console.log('✅ Migrations completed successfully!');
  await pool.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
  await pool.end();
  process.exit(1);
}
