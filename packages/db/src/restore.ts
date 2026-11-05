import fs from 'node:fs/promises';
import path from 'node:path';
import { DbClient, getDb } from './client.js';
import { runMigrations } from './migrate.js';
import { DatabaseBackup, BACKUP_TABLES_ORDER } from './backup.js';

export interface RestoreResult {
  restoredTables: Record<string, number>;
  totalRows: number;
}

export async function restoreBackup(
  targetDb: DbClient,
  backup: DatabaseBackup,
  options: { clearExisting?: boolean } = {}
): Promise<RestoreResult> {
  const { clearExisting = false } = options;

  if (!backup || !backup.metadata || !backup.data) {
    throw new Error('Invalid backup object: missing metadata or data section');
  }

  // Ensure migrations are run so tables exist
  await runMigrations(targetDb);

  const restoredTables: Record<string, number> = {};
  let totalRows = 0;

  await targetDb.transaction(async (tx) => {
    // 1. If clearExisting requested, delete from tables in reverse dependency order
    if (clearExisting) {
      const reversedTables = [...BACKUP_TABLES_ORDER].reverse();
      for (const table of reversedTables) {
        await tx.query(`DELETE FROM ${table};`);
      }
    }

    // 2. Insert records in forward dependency order
    for (const table of BACKUP_TABLES_ORDER) {
      const rows = backup.data[table] || [];
      restoredTables[table] = 0;

      for (const row of rows) {
        const columns = Object.keys(row);
        if (columns.length === 0) continue;

        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const values = columns.map((col) => {
          const val = row[col];
          if (val === null || val === undefined) {
            return null;
          }
          if (typeof val === 'object' && !(val instanceof Date)) {
            return JSON.stringify(val);
          }
          return val;
        });

        const insertSql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders});`;
        await tx.query(insertSql, values);
        restoredTables[table]++;
        totalRows++;
      }
    }
  });

  return {
    restoredTables,
    totalRows,
  };
}

export async function restoreBackupFromFile(
  targetDb: DbClient,
  filePath: string,
  options: { clearExisting?: boolean } = {}
): Promise<RestoreResult> {
  const resolvedPath = path.resolve(filePath);
  const raw = await fs.readFile(resolvedPath, 'utf-8');
  const backup = JSON.parse(raw) as DatabaseBackup;
  return await restoreBackup(targetDb, backup, options);
}

// CLI entrypoint
if (process.argv[1]?.endsWith('restore.ts') || process.argv[1]?.endsWith('restore.js')) {
  const defaultFile = path.resolve('katha-cafe-backup.json');
  const sourceFile = process.argv[2] || defaultFile;

  (async () => {
    console.log(`[restore] Initiating database restore from: ${sourceFile}`);
    const db = await getDb();
    const result = await restoreBackupFromFile(db, sourceFile, { clearExisting: true });
    console.log(`[restore] Successfully restored ${result.totalRows} rows across ${Object.keys(result.restoredTables).length} tables.`);
    for (const [table, count] of Object.entries(result.restoredTables)) {
      if (count > 0) {
        console.log(`  - ${table}: ${count} rows`);
      }
    }
    await db.close();
  })().catch((err) => {
    console.error('[restore] Restore failed:', err);
    process.exit(1);
  });
}
