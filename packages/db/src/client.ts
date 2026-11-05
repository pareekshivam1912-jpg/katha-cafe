import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

export interface DbResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<DbResult<T>>;
  exec(text: string): Promise<void>;
  close(): Promise<void>;
  transaction<T>(callback: (tx: DbClient) => Promise<T>): Promise<T>;
}

class PGliteClientAdapter implements DbClient {
  private pglite: PGlite;

  constructor(pgliteInstance: PGlite) {
    this.pglite = pgliteInstance;
  }

  async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<DbResult<T>> {
    const res = await this.pglite.query<T>(text, params);
    return {
      rows: res.rows,
      rowCount: res.affectedRows ?? res.rows.length,
    };
  }

  async exec(text: string): Promise<void> {
    await this.pglite.exec(text);
  }

  async close(): Promise<void> {
    await this.pglite.close();
  }

  async transaction<T>(callback: (tx: DbClient) => Promise<T>): Promise<T> {
    return await this.pglite.transaction(async (tx) => {
      const txAdapter: DbClient = {
        query: async <R extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<DbResult<R>> => {
          const res = await tx.query<R>(text, params);
          return {
            rows: res.rows,
            rowCount: res.affectedRows ?? res.rows.length,
          };
        },
        exec: async (text: string): Promise<void> => {
          await tx.exec(text);
        },
        close: async () => {},
        transaction: () => {
          throw new Error('Nested transactions are not supported');
        },
      };
      return await callback(txAdapter);
    });
  }
}

class PgPoolClientAdapter implements DbClient {
  private pool: pg.Pool;

  constructor(pool: pg.Pool) {
    this.pool = pool;
  }

  async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<DbResult<T>> {
    const res = await this.pool.query<T>(text, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount ?? 0,
    };
  }

  async exec(text: string): Promise<void> {
    await this.pool.query(text);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async transaction<T>(callback: (tx: DbClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const txAdapter: DbClient = {
        query: async <R extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<DbResult<R>> => {
          const res = await client.query<R>(text, params);
          return {
            rows: res.rows,
            rowCount: res.rowCount ?? 0,
          };
        },
        exec: async (text: string): Promise<void> => {
          await client.query(text);
        },
        close: async () => {},
        transaction: () => {
          throw new Error('Nested transactions are not supported');
        },
      };
      const result = await callback(txAdapter);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

let activeClient: DbClient | null = null;

export async function getDb(customDataDirOrUrl?: string): Promise<DbClient> {
  if (activeClient) {
    return activeClient;
  }

  const databaseUrl = customDataDirOrUrl || process.env.DATABASE_URL;

  // If a valid live PostgreSQL connection URL is provided and not in pure PGlite test mode
  if (databaseUrl && databaseUrl.startsWith('postgres') && process.env.USE_PGLITE !== 'true') {
    const pool = new pg.Pool({
      connectionString: databaseUrl,
    });
    activeClient = new PgPoolClientAdapter(pool);
    return activeClient;
  }

  // Dual-mode default: Embedded PGlite (zero setup, full PostgreSQL engine)
  const pgliteInstance = new PGlite();
  activeClient = new PGliteClientAdapter(pgliteInstance);
  return activeClient;
}

export async function resetDbInstance(): Promise<void> {
  if (activeClient) {
    await activeClient.close();
    activeClient = null;
  }
}

export async function createIsolatedDb(): Promise<DbClient> {
  const pgliteInstance = new PGlite();
  return new PGliteClientAdapter(pgliteInstance);
}
