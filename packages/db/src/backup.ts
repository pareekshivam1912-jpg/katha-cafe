import fs from 'node:fs/promises';
import path from 'node:path';
import { DbClient, getDb } from './client.js';

export interface DatabaseBackup {
  metadata: {
    version: string;
    exportedAt: string;
    cafe: string;
    totalRows: number;
    tables: Record<string, number>;
  };
  data: Record<string, Record<string, any>[]>;
}

export const BACKUP_TABLES_ORDER = [
  'staff_users',
  'menu_categories',
  'restaurant_tables',
  'customers',
  'inventory_items',
  'menu_items',
  'table_sessions',
  'orders',
  'order_items',
  'order_status_history',
  'payments',
  'inventory_movements',
  'audit_logs',
] as const;

export async function exportBackup(db: DbClient): Promise<DatabaseBackup> {
  const tableCounts: Record<string, number> = {};
  const data: Record<string, Record<string, any>[]> = {};
  let totalRows = 0;

  for (const table of BACKUP_TABLES_ORDER) {
    const res = await db.query(`SELECT * FROM ${table}`);
    data[table] = res.rows;
    tableCounts[table] = res.rows.length;
    totalRows += res.rows.length;
  }

  return {
    metadata: {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      cafe: 'Katha Cafe',
      totalRows,
      tables: tableCounts,
    },
    data,
  };
}

export async function exportBackupToFile(db: DbClient, filePath: string): Promise<DatabaseBackup> {
  const backup = await exportBackup(db);
  const resolvedPath = path.resolve(filePath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, JSON.stringify(backup, null, 2), 'utf-8');
  return backup;
}

// CLI entrypoint
if (process.argv[1]?.endsWith('backup.ts') || process.argv[1]?.endsWith('backup.js')) {
  const defaultFile = path.resolve('katha-cafe-backup.json');
  const targetFile = process.argv[2] || defaultFile;

  (async () => {
    console.log(`[backup] Initiating database backup to: ${targetFile}`);
    const db = await getDb();
    const backup = await exportBackupToFile(db, targetFile);
    console.log(`[backup] Successfully exported ${backup.metadata.totalRows} rows across ${Object.keys(backup.data).length} tables.`);
    for (const [table, count] of Object.entries(backup.metadata.tables)) {
      if (count > 0) {
        console.log(`  - ${table}: ${count} rows`);
      }
    }
    await db.close();
  })().catch((err) => {
    console.error('[backup] Backup failed:', err);
    process.exit(1);
  });
}
