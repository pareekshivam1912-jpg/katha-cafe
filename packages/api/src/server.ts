import { createApp } from './app.js';
import { env } from './config/env.js';
import { getDb, runMigrations, seedMockData } from '@katha-cafe/db';

async function startServer() {
  // Ensure schema migrations and canonical seed data are loaded on startup
  const db = await getDb();
  await runMigrations(db);
  await seedMockData(db);

  const app = createApp();

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`[katha-cafe-api] server listening on http://0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
  });

  process.on('SIGTERM', () => {
    console.log('[katha-cafe-api] SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('[katha-cafe-api] HTTP server closed');
    });
  });
}

startServer().catch((err) => {
  console.error('[katha-cafe-api] Fatal server startup error:', err);
  process.exit(1);
});
