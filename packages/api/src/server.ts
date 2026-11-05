import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[katha-cafe-api] server listening on port ${env.PORT} (${env.NODE_ENV})`);
});

process.on('SIGTERM', () => {
  console.log('[katha-cafe-api] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[katha-cafe-api] HTTP server closed');
  });
});
