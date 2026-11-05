import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DbClient, getDb } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(db?: DbClient): Promise<string[]> {
  const client = db || (await getDb());

  // Ensure migrations tracking table exists
  await client.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedResult = await client.query<{ migration_name: string }>(
    'SELECT migration_name FROM schema_migrations ORDER BY id ASC'
  );
  const appliedSet = new Set(appliedResult.rows.map((r) => r.migration_name));

  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found at: ${migrationsDir}`);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: string[] = [];

  for (const file of files) {
    if (appliedSet.has(file)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    await client.transaction(async (tx) => {
      // Execute the migration SQL
      await tx.exec(sql);
      // Record migration
      await tx.query(
        'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
        [file]
      );
    });

    newlyApplied.push(file);
    console.log(`[db] Applied migration: ${file}`);
  }

  return newlyApplied;
}

// Allow CLI execution: tsx src/migrate.ts
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then((applied) => {
      console.log(`[db] Migrations complete. Newly applied: ${applied.length}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[db] Migration error:', err);
      process.exit(1);
    });
}
