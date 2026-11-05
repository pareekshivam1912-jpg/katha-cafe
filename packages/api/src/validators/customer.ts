import { z } from 'zod';

export function normalizeIndianMobile(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, '');

  // Format: +91XXXXXXXXXX
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // Format: 91XXXXXXXXXX (without plus)
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Format: 0XXXXXXXXXX (with leading zero)
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned.substring(1)}`;
  }

  // Format: XXXXXXXXXX (standard 10-digit Indian mobile number)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  return null;
}

export const customerIdentificationSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name cannot exceed 80 characters'),
  mobile: z
    .string()
    .trim()
    .refine((val) => normalizeIndianMobile(val) !== null, {
      message: 'Please enter a valid 10-digit Indian mobile number',
    })
    .transform((val) => normalizeIndianMobile(val)!),
});
