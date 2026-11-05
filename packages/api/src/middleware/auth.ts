import { Request, Response, NextFunction } from 'express';
import { verifySessionToken, StaffSessionPayload } from '../utils/token.js';
import { getDb } from '@katha-cafe/db';

export interface AuthenticatedStaff {
  id: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN';
  fullName: string;
}

declare global {
  namespace Express {
    interface Request {
      staff?: AuthenticatedStaff;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token: string | undefined = req.cookies?.katha_session;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7).trim();
  }

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please log in.',
    });
    return;
  }

  const payload: StaffSessionPayload | null = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired session. Please log in again.',
    });
    return;
  }

  try {
    const db = await getDb();
    const result = await db.query<{ id: string; username: string; role: any; full_name: string; is_active: boolean }>(
      'SELECT id, username, role, full_name, is_active FROM staff_users WHERE id = $1',
      [payload.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Account is inactive or no longer exists.',
      });
      return;
    }

    const staffRecord = result.rows[0];
    req.staff = {
      id: staffRecord.id,
      username: staffRecord.username,
      role: staffRecord.role,
      fullName: staffRecord.full_name,
    };

    next();
  } catch (err) {
    console.error('[auth middleware] DB error:', err);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to verify session.',
    });
  }
}

export function requireRole(allowedRoles: Array<'ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.staff) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.staff.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Role '${req.staff.role}' is not authorized for this resource.`,
      });
      return;
    }

    next();
  };
}
