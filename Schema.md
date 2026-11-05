# Database Schema — Katha Cafe

## 1. Conventions

- PostgreSQL relational schema.
- Primary keys use UUIDs unless an external human-readable order number is required.
- Store money as integer paise (`BIGINT`); display INR by formatting paise / 100.
- Store timestamps as `TIMESTAMPTZ` in UTC.
- Use foreign keys and database constraints for integrity.
- Schema is proposed; do not run migrations until the relevant implementation phase is approved.

## 2. Tables

### `staff_users`
- `id UUID PRIMARY KEY`
- `full_name TEXT NOT NULL`
- `username TEXT UNIQUE NOT NULL`
- `password_hash TEXT NOT NULL`
- `role TEXT CHECK (role IN ('ADMIN','MANAGER','CASHIER','KITCHEN'))`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at`, `updated_at TIMESTAMPTZ`

### `menu_categories`
- `id UUID PRIMARY KEY`
- `name TEXT UNIQUE NOT NULL`
- `display_order INTEGER NOT NULL DEFAULT 0`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`

### `menu_items`
- `id UUID PRIMARY KEY`
- `category_id UUID REFERENCES menu_categories(id)`
- `name TEXT NOT NULL`
- `description TEXT`
- `price_paise BIGINT NOT NULL CHECK (price_paise >= 0)`
- `is_available BOOLEAN NOT NULL DEFAULT TRUE`
- `display_order INTEGER NOT NULL DEFAULT 0`
- `created_at`, `updated_at TIMESTAMPTZ`

### `restaurant_tables`
- `id UUID PRIMARY KEY`
- `table_label TEXT UNIQUE NOT NULL`
- `qr_token_hash TEXT UNIQUE NOT NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ`

Store only a hash of the QR token in the database. Generate a high-entropy token; never expose the database ID.

### `table_sessions`
- `id UUID PRIMARY KEY`
- `table_id UUID REFERENCES restaurant_tables(id)`
- `status TEXT CHECK (status IN ('OPEN','CLOSED'))`
- `opened_at TIMESTAMPTZ NOT NULL`
- `closed_at TIMESTAMPTZ`
- `opened_by UUID REFERENCES staff_users(id)`

### `customers`
- `id UUID PRIMARY KEY`
- `full_name TEXT NOT NULL`
- `mobile_e164 TEXT NOT NULL`
- `created_at`, `updated_at TIMESTAMPTZ`

Do not assume phone number alone proves identity. Avoid unnecessary profile fields.

### `orders`
- `id UUID PRIMARY KEY`
- `order_number TEXT UNIQUE NOT NULL`
- `public_status_token_hash TEXT UNIQUE`
- `table_session_id UUID REFERENCES table_sessions(id)`
- `customer_id UUID REFERENCES customers(id)`
- `order_type TEXT CHECK (order_type IN ('DINE_IN','TAKEAWAY','COUNTER'))`
- `status TEXT CHECK (status IN ('DRAFT','SUBMITTED','ACCEPTED','PREPARING','READY','SERVED','CLOSED','REJECTED','CANCELLED'))`
- `subtotal_paise BIGINT NOT NULL`
- `discount_paise BIGINT NOT NULL DEFAULT 0`
- `tax_paise BIGINT NOT NULL DEFAULT 0`
- `total_paise BIGINT NOT NULL`
- `currency CHAR(3) NOT NULL DEFAULT 'INR'`
- `notes TEXT`
- `created_by UUID REFERENCES staff_users(id)`
- `created_at`, `updated_at TIMESTAMPTZ`

### `order_items`
- `id UUID PRIMARY KEY`
- `order_id UUID REFERENCES orders(id) ON DELETE RESTRICT`
- `menu_item_id UUID REFERENCES menu_items(id) ON DELETE RESTRICT`
- `item_name_snapshot TEXT NOT NULL`
- `unit_price_paise BIGINT NOT NULL`
- `quantity INTEGER NOT NULL CHECK (quantity > 0)`
- `line_total_paise BIGINT NOT NULL`
- `notes TEXT`

Snapshots preserve the name and price charged at order time even if the menu changes later.

### `order_status_history`
- `id UUID PRIMARY KEY`
- `order_id UUID REFERENCES orders(id)`
- `from_status TEXT`
- `to_status TEXT NOT NULL`
- `changed_by UUID REFERENCES staff_users(id)`
- `reason TEXT`
- `created_at TIMESTAMPTZ NOT NULL`

### `payments`
- `id UUID PRIMARY KEY`
- `order_id UUID NOT NULL REFERENCES orders(id)`
- `idempotency_key TEXT UNIQUE NOT NULL`
- `amount_paise BIGINT NOT NULL CHECK (amount_paise > 0)`
- `method TEXT CHECK (method IN ('CASH','UPI_AT_COUNTER','CARD_AT_COUNTER'))`
- `status TEXT CHECK (status IN ('PENDING','PAID','FAILED','VOIDED','REFUND_PENDING','REFUNDED'))`
- `bank_reference TEXT`
- `verified_by UUID REFERENCES staff_users(id)`
- `verified_at TIMESTAMPTZ`
- `created_at`, `updated_at TIMESTAMPTZ`

Enforce at most one successful payment per order with a partial unique index on `payments(order_id) WHERE status = 'PAID'`. Validate that paid amount equals order total in the same transaction.

### `inventory_items`
- `id UUID PRIMARY KEY`
- `name TEXT UNIQUE NOT NULL`
- `unit TEXT NOT NULL`
- `quantity NUMERIC(12,3) NOT NULL DEFAULT 0`
- `reorder_level NUMERIC(12,3)`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`

### `inventory_movements`
- `id UUID PRIMARY KEY`
- `inventory_item_id UUID REFERENCES inventory_items(id)`
- `movement_type TEXT CHECK (movement_type IN ('PURCHASE','ADJUSTMENT','WASTE','CONSUMPTION','RETURN'))`
- `quantity_delta NUMERIC(12,3) NOT NULL`
- `reason TEXT NOT NULL`
- `order_id UUID REFERENCES orders(id)`
- `created_by UUID REFERENCES staff_users(id)`
- `created_at TIMESTAMPTZ NOT NULL`

### `recipes` and `recipe_items` (deferred)
Only add after café owner supplies ingredient quantities and confirms recipe mapping. Do not infer recipes from menu names.

### `audit_logs`
- `id UUID PRIMARY KEY`
- `actor_user_id UUID REFERENCES staff_users(id)`
- `action TEXT NOT NULL`
- `entity_type TEXT NOT NULL`
- `entity_id UUID`
- `details JSONB NOT NULL DEFAULT '{}'`
- `created_at TIMESTAMPTZ NOT NULL`

## 3. Required constraints and indexes

- Unique `order_number`, `idempotency_key`, QR token hash and public status token hash.
- Positive quantity and non-negative prices/totals.
- One PAID payment per order (partial unique index).
- Index orders by `(status, created_at)`, `table_session_id`, and `customer_id`.
- Index order items by `order_id`.
- Index inventory movements by `(inventory_item_id, created_at)`.
- Restrict deletion of menu items referenced by historical order items.
- Use transactions for order creation, payment verification and inventory movement.

## 4. Data retention

- Retention period for customer mobile numbers must be confirmed by the owner.
- Do not retain payment credentials, UPI PINs, card numbers or CVV.
- Do not store screenshots as payment proof unless the owner explicitly approves a secure process; manual bank verification is preferred.
- Backups must be access-controlled and restorable.
