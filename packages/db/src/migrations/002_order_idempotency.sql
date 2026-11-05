-- Migration 002: Add idempotency_key to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
