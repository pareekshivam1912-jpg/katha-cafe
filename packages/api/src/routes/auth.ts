import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDb, verifyPassword } from '@katha-cafe/db';
import { createSessionToken } from '../utils/token.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/login
authRouter.post('/auth/login', async (req: Request, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: 'BadRequest',
      message: 'Invalid login payload',
      details: parseResult.error.format(),
    });
    return;
  }

  const { username, password } = parseResult.data;

  try {
    const db = await getDb();
    const result = await db.query<{
      id: string;
      full_name: string;
      username: string;
      password_hash: string;
      role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN';
      is_active: boolean;
    }>(
      'SELECT id, full_name, username, password_hash, role, is_active FROM staff_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password.',
      });
      return;
    }

    const staff = result.rows[0];

    if (!staff.is_active) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'This staff account has been deactivated. Please contact management.',
      });
      return;
    }

    const passwordMatches = await verifyPassword(password, staff.password_hash);
    if (!passwordMatches) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid username or password.',
      });
      return;
    }

    const token = createSessionToken({
      id: staff.id,
      username: staff.username,
      role: staff.role,
      full_name: staff.full_name,
    });

    // Set HttpOnly, SameSite cookie
    res.cookie('katha_session', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    res.status(200).json({
      message: 'Authentication successful',
      token,
      user: {
        id: staff.id,
        username: staff.username,
        role: staff.role,
        fullName: staff.full_name,
      },
    });
  } catch (err) {
    console.error('[auth] Login error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'An unexpected error occurred during login.',
    });
  }
});

// POST /api/auth/logout
authRouter.post('/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('katha_session', {
    httpOnly: true,
    sameSite: 'lax',
  });
  res.status(200).json({
    message: 'Logged out successfully',
  });
});

// GET /api/auth/me
authRouter.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  res.status(200).json({
    user: req.staff,
  });
});

// Protected role test routes to verify RBAC
authRouter.get('/admin/metrics', requireAuth, requireRole(['ADMIN']), (req: Request, res: Response) => {
  res.status(200).json({
    access: 'granted',
    role: req.staff?.role,
    area: 'admin-dashboard',
  });
});

authRouter.get('/pos/orders', requireAuth, requireRole(['ADMIN', 'MANAGER', 'CASHIER']), (req: Request, res: Response) => {
  res.status(200).json({
    access: 'granted',
    role: req.staff?.role,
    area: 'pos-terminal',
  });
});

authRouter.get('/kitchen/tickets', requireAuth, requireRole(['ADMIN', 'KITCHEN']), (req: Request, res: Response) => {
  res.status(200).json({
    access: 'granted',
    role: req.staff?.role,
    area: 'kitchen-display',
  });
});
