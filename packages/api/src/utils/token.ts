import crypto from 'node:crypto';
import { env } from '../config/env.js';

export interface StaffSessionPayload {
  userId: string;
  username: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN';
  fullName: string;
  issuedAt: number;
  expiresAt: number;
}

const DEFAULT_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours (typical shift)

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

export function createSessionToken(
  user: { id: string; username: string; role: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'KITCHEN'; full_name: string },
  secret: string = env.SESSION_SECRET,
  expiryMs: number = DEFAULT_EXPIRY_MS
): string {
  const now = Date.now();
  const payload: StaffSessionPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name,
    issuedAt: now,
    expiresAt: now + expiryMs,
  };

  const payloadString = JSON.stringify(payload);
  const encodedPayload = base64UrlEncode(payloadString);

  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string,
  secret: string = env.SESSION_SECRET
): StaffSessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [encodedPayload, providedSignature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload: StaffSessionPayload = JSON.parse(base64UrlDecode(encodedPayload));
    if (Date.now() > payload.expiresAt) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}
