import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb } from '@katha-cafe/db';
import { generateOpaqueToken, hashQrToken, generateQrDataUrl } from '../utils/qr.js';
import { customerIdentificationSchema } from '../validators/customer.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const tablesRouter = Router();

// GET /api/tables/resolve/:token - Public QR resolution
tablesRouter.get('/tables/resolve/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  if (!token || token.length < 16) {
    res.status(404).json({
      error: 'TableUnavailable',
      message: 'This table QR is unavailable. Please ask staff.',
    });
    return;
  }

  const tokenHash = hashQrToken(token);

  try {
    const db = await getDb();

    // Look up table by hash
    const tableRes = await db.query<{ id: string; table_label: string; is_active: boolean }>(
      'SELECT id, table_label, is_active FROM restaurant_tables WHERE qr_token_hash = $1',
      [tokenHash]
    );

    if (tableRes.rows.length === 0 || !tableRes.rows[0].is_active) {
      res.status(404).json({
        error: 'TableUnavailable',
        message: 'This table QR is unavailable. Please ask staff.',
      });
      return;
    }

    const table = tableRes.rows[0];

    // Find or create an open table session
    let sessionRes = await db.query<{ id: string; status: string }>(
      `SELECT id, status FROM table_sessions WHERE table_id = $1 AND status = 'OPEN' ORDER BY opened_at DESC LIMIT 1`,
      [table.id]
    );

    let sessionId: string;
    if (sessionRes.rows.length === 0) {
      const newSession = await db.query<{ id: string }>(
        `INSERT INTO table_sessions (table_id, status) VALUES ($1, 'OPEN') RETURNING id`,
        [table.id]
      );
      sessionId = newSession.rows[0].id;
    } else {
      sessionId = sessionRes.rows[0].id;
    }

    // Return safe presentation payload (no DB IDs or token hashes leaked)
    res.status(200).json({
      valid: true,
      tableLabel: table.table_label,
      sessionId,
    });
  } catch (err) {
    console.error('[tables] Resolve error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to resolve table QR.',
    });
  }
});

// POST /api/table-sessions/identify-customer - Customer identification
tablesRouter.post('/table-sessions/identify-customer', async (req: Request, res: Response) => {
  const parse = customerIdentificationSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Validation failed',
      details: parse.error.format(),
    });
    return;
  }

  const { sessionId, fullName, mobile } = parse.data;

  try {
    const db = await getDb();

    // Verify session exists and is OPEN
    const sessionRes = await db.query<{ id: string; status: string; table_id: string }>(
      'SELECT id, status, table_id FROM table_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionRes.rows.length === 0) {
      res.status(404).json({
        error: 'NotFound',
        message: 'Table session not found.',
      });
      return;
    }

    if (sessionRes.rows[0].status === 'CLOSED') {
      res.status(400).json({
        error: 'SessionClosed',
        message: 'This table session has been closed. Please ask staff for assistance.',
      });
      return;
    }

    // Find or create customer by mobile
    let customerRes = await db.query<{ id: string; full_name: string; mobile_e164: string }>(
      'SELECT id, full_name, mobile_e164 FROM customers WHERE mobile_e164 = $1',
      [mobile]
    );

    let customerId: string;
    if (customerRes.rows.length === 0) {
      const newCust = await db.query<{ id: string }>(
        'INSERT INTO customers (full_name, mobile_e164) VALUES ($1, $2) RETURNING id',
        [fullName, mobile]
      );
      customerId = newCust.rows[0].id;
    } else {
      customerId = customerRes.rows[0].id;
      // Update full name if changed
      await db.query('UPDATE customers SET full_name = $1, updated_at = NOW() WHERE id = $2', [
        fullName,
        customerId,
      ]);
    }

    res.status(200).json({
      message: 'Customer verified',
      sessionId,
      customer: {
        id: customerId,
        fullName,
        mobileE164: mobile,
      },
    });
  } catch (err) {
    console.error('[customer] Identification error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to record customer details.',
    });
  }
});

// -------------------------------------------------------------
// Admin / Staff Table Management Endpoints
// -------------------------------------------------------------

const createTableSchema = z.object({
  tableLabel: z.string().trim().min(1, 'Table label is required'),
});

// GET /api/admin/tables - List tables
tablesRouter.get(
  '/admin/tables',
  requireAuth,
  requireRole(['ADMIN', 'MANAGER']),
  async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      const result = await db.query(`
        SELECT 
          t.id, 
          t.table_label, 
          t.is_active, 
          t.created_at,
          s.id AS active_session_id,
          s.status AS active_session_status
        FROM restaurant_tables t
        LEFT JOIN table_sessions s ON s.table_id = t.id AND s.status = 'OPEN'
        ORDER BY t.table_label ASC
      `);

      res.status(200).json({ tables: result.rows });
    } catch (err) {
      console.error('[tables admin] List error:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch tables.' });
    }
  }
);

// POST /api/admin/tables - Create new table with local QR code
tablesRouter.post(
  '/admin/tables',
  requireAuth,
  requireRole(['ADMIN', 'MANAGER']),
  async (req: Request, res: Response) => {
    const parse = createTableSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'BadRequest', details: parse.error.format() });
      return;
    }

    const { tableLabel } = parse.data;
    const token = generateOpaqueToken();
    const tokenHash = hashQrToken(token);
    const qrUrl = `${env.CLIENT_URL}/order?token=${token}`;

    try {
      const db = await getDb();
      const result = await db.query<{ id: string; table_label: string; is_active: boolean }>(
        `
        INSERT INTO restaurant_tables (table_label, qr_token_hash, is_active)
        VALUES ($1, $2, TRUE)
        RETURNING id, table_label, is_active;
        `,
        [tableLabel, tokenHash]
      );

      const qrDataUrl = await generateQrDataUrl(qrUrl);

      res.status(201).json({
        table: result.rows[0],
        token,
        qrUrl,
        qrDataUrl,
      });
    } catch (err: any) {
      if (err.code === '23505') {
        res.status(409).json({ error: 'Conflict', message: 'A table with this label already exists.' });
        return;
      }
      console.error('[tables admin] Create error:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'Failed to create table.' });
    }
  }
);

// POST /api/admin/tables/:id/close-session - Close active table session
tablesRouter.post(
  '/admin/tables/:id/close-session',
  requireAuth,
  requireRole(['ADMIN', 'MANAGER', 'CASHIER']),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const db = await getDb();
      const result = await db.query(
        `
        UPDATE table_sessions
        SET status = 'CLOSED', closed_at = NOW()
        WHERE table_id = $1 AND status = 'OPEN'
        RETURNING id, status, closed_at;
        `,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          error: 'NotFound',
          message: 'No active open session found for this table.',
        });
        return;
      }

      res.status(200).json({
        message: 'Table session closed successfully',
        session: result.rows[0],
      });
    } catch (err) {
      console.error('[tables admin] Close session error:', err);
      res.status(500).json({ error: 'InternalServerError', message: 'Failed to close table session.' });
    }
  }
);
