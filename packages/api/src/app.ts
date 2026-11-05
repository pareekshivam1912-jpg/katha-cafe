import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { menuRouter } from './routes/menu.js';
import { tablesRouter } from './routes/tables.js';
import { ordersRouter } from './routes/orders.js';
import { posRouter } from './routes/pos.js';
import { paymentsRouter } from './routes/payments.js';
import { kdsRouter } from './routes/kds.js';
import { inventoryRouter } from './routes/inventory.js';
import { reportsRouter } from './routes/reports.js';

export function createApp(): Express {
  const app = express();

  // Security Hardening: Disable Express fingerprint & inject defense-in-depth headers
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(
    cors({
      origin: env.CLIENT_URL === '*' ? true : env.CLIENT_URL,
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
  app.use('/api', ordersRouter);
  app.use('/api/pos', posRouter);
  app.use('/api/pos', paymentsRouter);
  app.use('/api/kds', kdsRouter);
  app.use('/api/admin', inventoryRouter);
  app.use('/api/admin', reportsRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found on this server.',
    });
  });

  return app;
}
