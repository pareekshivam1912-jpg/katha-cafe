import { z } from 'zod';

export const recordPaymentSchema = z
  .object({
    amountPaise: z
      .number()
      .int('Amount in paise must be an integer')
      .positive('Payment amount must be greater than 0')
      .optional(),
    amountInr: z
      .number()
      .positive('Payment amount must be greater than 0')
      .optional(),
    method: z.enum(['CASH', 'UPI_AT_COUNTER', 'CARD_AT_COUNTER'], {
      errorMap: () => ({
        message: "Payment method must be 'CASH', 'UPI_AT_COUNTER', or 'CARD_AT_COUNTER'",
      }),
    }),
    idempotencyKey: z
      .string()
      .trim()
      .min(8, 'Idempotency key must be at least 8 characters')
      .max(128, 'Idempotency key too long'),
    bankReference: z
      .string()
      .trim()
      .max(100, 'Bank reference cannot exceed 100 characters')
      .optional(),
    notes: z.string().trim().max(200).optional(),
  })
  .refine((data) => data.amountPaise !== undefined || data.amountInr !== undefined, {
    message: 'Either amountPaise or amountInr must be provided',
  });
