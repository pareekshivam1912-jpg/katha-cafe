import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { menuRouter } from './routes/menu.js';
import { tablesRouter } from './routes/tables.js';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());

  // Mount API routes
  app.use('/api', healthRouter);
  app.use('/api', authRouter);
  app.use('/api', menuRouter);
  app.use('/api', tablesRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found on this server.',
    });
  });

  return app;
}
