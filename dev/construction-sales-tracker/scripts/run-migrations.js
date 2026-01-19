import { existsSync } from 'fs';
import { resolve } from 'path';

// Try to import from dist (production) first, then server (development)
let runMigrations;
try {
  const distPath = resolve(process.cwd(), 'dist', 'db.js');
  if (existsSync(distPath)) {
    const dbModule = await import('../dist/db.js');
    runMigrations = dbModule.runMigrations;
  } else {
    const dbModule = await import('../server/db.js');
    runMigrations = dbModule.runMigrations;
  }
} catch (importError) {
  // Fallback to server in development
  const dbModule = await import('../server/db.js');
  runMigrations = dbModule.runMigrations;
}

console.log('Starting migrations...');
console.log('Current working directory:', process.cwd());

try {
  await runMigrations();
  console.log('✅ Migrations completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error);
  if (error instanceof Error) {
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
  }
  process.exit(1);
}
