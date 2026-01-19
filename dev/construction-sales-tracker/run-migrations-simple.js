// Simple migration runner that executes SQL files directly
import { Pool, neonConfig } from '@neondatabase/serverless';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Find migrations folder
const possiblePaths = [
  path.resolve(process.cwd(), 'migrations'),
  path.resolve(process.cwd(), '..', 'migrations'),
];

let migrationsFolder = null;
for (const possiblePath of possiblePaths) {
  try {
    const files = readdirSync(possiblePath);
    if (files.some(f => f.endsWith('.sql'))) {
      migrationsFolder = possiblePath;
      console.log(`✅ Found migrations folder at: ${migrationsFolder}`);
      break;
    }
  } catch (e) {
    // Continue searching
  }
}

if (!migrationsFolder) {
  console.error('❌ Migrations folder not found');
  process.exit(1);
}

// Get all SQL files and sort them
const files = readdirSync(migrationsFolder)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`📋 Found ${files.length} migration files`);

async function runMigrations() {
  for (const file of files) {
    const filePath = path.join(migrationsFolder, file);
    console.log(`\n🔄 Running migration: ${file}`);
    
    try {
      const sql = readFileSync(filePath, 'utf-8');
      
      // Split by statement-breakpoint and execute each statement
      const statements = sql
        .split('--> statement-breakpoint')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }
      
      console.log(`✅ Completed: ${file}`);
    } catch (error) {
      // Check if error is "already exists" - that's okay
      if (error.message && (
        error.message.includes('already exists') ||
        error.message.includes('duplicate') ||
        error.code === '42P07' // duplicate_table
      )) {
        console.log(`⚠️  Skipped (already exists): ${file}`);
      } else {
        console.error(`❌ Error in ${file}:`, error.message);
        throw error;
      }
    }
  }
}

try {
  await runMigrations();
  console.log('\n✅ All migrations completed successfully!');
  await pool.end();
  process.exit(0);
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  await pool.end();
  process.exit(1);
}
