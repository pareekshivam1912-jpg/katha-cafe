# Decisions — Katha Cafe

Record every material technical/product decision here.

## D-001 — One shared backend and database
- **Decision:** Public menu, QR ordering, POS and KDS use one API and one PostgreSQL database.
- **Reason:** Avoid duplicated orders, menu prices and inconsistent status.
- **Status:** Proposed; implement only after phase approval.

## D-002 — Local-first and free-only
- **Decision:** Develop and test locally before choosing any hosting.
- **Reason:** Avoid paid tiers, card-required trials and accidental usage charges.
- **Alternatives:** Verified no-card free hosting or café-owned local machine.
- **Status:** Accepted as project constraint.

## D-003 — No online gateway in initial release
- **Decision:** Start with cash and cashier-verified UPI-at-counter recording.
- **Reason:** A generated UPI QR or intent link does not verify payment. A trusted bank/acquirer confirmation route is required; no free route has been verified.
- **Alternatives if online payment is later required:**
  1. Ask acquiring bank for merchant dynamic QR/status API with written confirmation of zero fees/card requirements.
  2. Keep payment at counter and verify in the bank app/statement.
  3. Build a MOCK sandbox adapter for development only; never mark real orders paid.
- **Status:** Accepted for initial scope; online integration blocked pending proof and approval.

## D-004 — Customer identification without account registration
- **Decision:** Require name and 10-digit mobile number for QR order; no password or account signup.
- **Reason:** Reduce friction and avoid collecting unnecessary credentials.
- **Status:** Proposed.

## D-005 — Menu source and price conflicts
- **Decision:** Detailed category page price is treated as the provisional menu price; recommendation-card prices are separately documented.
- **Reason:** Several featured recommendations differ from the category list.
- **Status:** Provisional; owner confirmation required before menu import.

## D-006 — No automatic inventory deduction without recipes
- **Decision:** Inventory ledger can be managed manually; recipe-based consumption is deferred.
- **Reason:** Ingredient quantities cannot be inferred reliably from menu item names.
- **Status:** Accepted.

## D-007 — Realtime transport
- **Decision:** Socket.IO is a proposed option; polling is an acceptable simpler local alternative if realtime setup adds unnecessary complexity.
- **Reason:** KDS needs prompt updates, but scope should remain minimal.
- **Status:** Not selected; decide in Phase 6.

## D-008 — Design document omitted
- **Decision:** Do not create or modify `Design.md`.
- **Reason:** Explicit user instruction for this documentation update.
- **Status:** Accepted.

## D-009 — Monorepo workspace and Phase 1 toolchain
- **Decision:** Use npm workspaces (`packages/*`) with dedicated packages for `@katha-cafe/api` (Express backend), `@katha-cafe/web` (Next.js frontend placeholder), and `@katha-cafe/db` (PostgreSQL migrations placeholder).
- **Toolchain & Pinned Dependencies:**
  - `express`: 4.21.2 (License: MIT) — minimal HTTP server framework.
  - `cors`: 2.8.5 (License: MIT) — cross-origin resource sharing middleware.
  - `dotenv`: 16.4.7 (License: MIT) — environment variable loading.
  - `zod`: 3.24.2 (License: MIT) — schema validation for config/requests.
  - `typescript`: 5.8.2 (License: Apache-2.0) — static typing.
  - `vitest`: 3.0.7 (License: MIT) — unit/integration test runner.
  - `supertest`: 7.0.0 (License: MIT) — HTTP assertion library.
  - `tsx`: 4.19.3 (License: MIT) — TypeScript execution without precompilation.
- **Reason:** User confirmed monorepo structure; all tools are free, open source, and locally executable with no cloud accounts or billing.
- **Status:** Accepted and verified in Phase 1.

## D-010 — Dual-mode database client and scrypt password hashing
- **Decision:**
  1. **Dual-mode PostgreSQL:** In local/test environments where no live PostgreSQL service is running, use embedded PGlite (`@electric-sql/pglite` 0.2.16, Apache-2.0). When `DATABASE_URL` is configured to a PostgreSQL instance, connect via `pg` (8.13.3, MIT).
  2. **Password Hashing:** Use Node.js built-in `crypto.scrypt` with 16-byte random salt, 64-byte key length, and constant-time comparison via `crypto.timingSafeEqual`. Zero native C++ compilation issues on Windows, NIST-approved, zero external dependencies.
  3. **Staff Sessions:** Stateful DB-backed authentication with HMAC-SHA256 signed session tokens stored in HttpOnly, SameSite cookies or `Authorization: Bearer` header.
  4. **RBAC:** Enforced strictly on server through `requireAuth` and `requireRole` middleware.
- **Dependencies Added:**
  - `@electric-sql/pglite`: 0.2.16 (License: Apache-2.0) — embedded WASM PostgreSQL engine.
  - `pg`: 8.13.3 (License: MIT) — standard PostgreSQL client.
  - `cookie-parser`: 1.4.7 (License: MIT) — parse HTTP cookies.
- **Reason:** Confirmed by user; enables full offline, zero-card, local-first development while preserving PostgreSQL schema fidelity and constraints.
- **Status:** Accepted and verified in Phase 2.

## D-011 — Authoritative menu prices and Next.js public website
- **Decision:**
  1. **Canonical Menu Prices:** Per user confirmation, detailed category page prices are adopted as authoritative for the 4 previously flagged items (Cheese Garlic Bread: ₹90 / 9000 paise; Bombay Grill Sandwich: ₹110 / 11000 paise; Indiana Pizza: ₹170 / 17000 paise; Penne Alfredo: ₹170 / 17000 paise).
  2. **Public Website:** Next.js 15 App Router with React 19 and Tailwind CSS in `packages/web`, using Katha Cafe brand tokens (forest green `#063B27`, warm ivory `#F7F0E2`, antique gold `#C6922E`, and editorial serif typography) fetching live menu data from the API.
  3. **Price Auditing:** Any staff modification to `price_paise` automatically writes an immutable audit record to `audit_logs` capturing user, old price, new price, and mandatory reason.
- **Dependencies Added:**
  - `next`: 15.2.1 (License: MIT) — React framework.
  - `react`: 19.0.0 (License: MIT) — UI library.
  - `react-dom`: 19.0.0 (License: MIT) — DOM renderer.
  - `tailwindcss`: 3.4.17 (License: MIT) — utility CSS styling.
- **Reason:** Satisfies owner confirmation gate, fulfills Design.md specifications, and ensures full price integrity.
- **Status:** Accepted and verified in Phase 3.

## D-012 — Opaque QR tokens, token hashing, and customer identification
- **Decision:**
  1. **Opaque Tokens:** Tables are identified by 32-byte cryptographically secure random hex tokens (`crypto.randomBytes(32)`), preventing guessable/sequential table ID tampering (e.g. `table=1`).
  2. **Token Hashing:** In accordance with Schema.md, only the SHA-256 hash of the token (`qr_token_hash`) is stored in the database. Resolving a QR hashes the incoming token before lookup.
  3. **Zero Token/ID Leakage:** Public resolution payload exposes only presentation data (`tableLabel: "Table 4"`, `sessionId`), never leaking database UUIDs or token hashes.
  4. **Customer Validation:** Full name required (min 2 chars). Mobile number strictly validated for 10-digit Indian formats (`[6-9]\d{9}`) and normalized to E.164 (`+91XXXXXXXXXX`). No password or customer account registration required.
  5. **Session Control:** Closed table sessions reject subsequent customer identification and order submissions.
- **Dependencies Added:**
  - `qrcode`: 1.5.4 (License: MIT) — local QR code generation.
- **Reason:** Enforces customer privacy, prevents cross-table tampering, and satisfies PRD Section 4.3.
- **Status:** Accepted and verified in Phase 4.

## D-013 — Idempotent QR order placement, server recalculation, transactional snapshotting, and public status token hash
- **Decision:**
  1. **Server-authoritative Price Recalculation:** Client submissions contain only `itemId`, `quantity`, and optional `notes`. Client prices are never trusted or accepted. The server fetches active database menu items, validates availability (`is_available = TRUE`), calculates `unit_price_paise * quantity`, and computes item subtotal, tax (0 paise pending tax policy confirmation), and total paise.
  2. **Transactional Order Snapshotting:** Each order and its line items are inserted within an explicit database transaction (`BEGIN` ... `COMMIT`). Line items snapshot `item_name`, `unit_price_paise`, `quantity`, and `subtotal_paise` at the exact moment of order placement, insulating historical receipts against future menu price modifications.
  3. **Order Placement Idempotency:** Submissions accept an optional `idempotencyKey`. A unique column `orders.idempotency_key` guarantees that network retries or double submits return the existing order record (`200 OK` with `isRetry: true`) rather than generating duplicate orders.
  4. **Public Order Status Token:** Orders receive a 32-byte cryptographically secure random public status token (`status_token`). Only its SHA-256 hash is persisted in `orders.status_token_hash`. Customers poll or retrieve order status using the plain token via `GET /api/orders/:publicToken/status` without exposing internal database UUIDs or customer PII.
  5. **Session Integrity:** Orders require an active, open table session (`table_sessions.status = 'ACTIVE'`). Attempting to submit orders to closed sessions returns a strict 400 rejection.
- **Dependencies Added:** None (uses Node.js built-in `crypto` and existing database layer).
- **Reason:** Satisfies PRD Section 4.4, prevents fraudulent pricing or duplicate kitchen ticket spam, and guarantees customer order recovery.
- **Status:** Accepted and verified in Phase 5.

## D-014 — Staff POS order entry, Cashier QR review, and Kitchen Display System (KDS) state progression
- **Decision:**
  1. **Staff POS Order Creation (`POST /api/pos/orders`):** Authorized cashiers, managers, and admins create direct orders across types (`COUNTER`, `DINE_IN`, `TAKEAWAY`) with full server-side price recalculation. POS orders transition immediately to `ACCEPTED` status, entering the kitchen queue directly without requiring secondary approval.
  2. **Cashier QR Order Review (`/api/pos/orders/pending`):** Customer QR orders arrive in `SUBMITTED` status and appear in the Cashier review queue. Cashiers can accept orders (`POST /api/pos/orders/:id/accept`), transitioning them to `ACCEPTED` for kitchen display, or reject them (`POST /api/pos/orders/:id/reject`) with a mandatory reason, transitioning them to `REJECTED`.
  3. **Kitchen Display System (KDS) Ticket Queue (`GET /api/kds/orders`):** Kitchen monitors active orders in statuses `('ACCEPTED', 'PREPARING', 'READY')`. Financial data (unit prices and order totals) is strictly omitted from the kitchen view to enforce privacy and focus on preparation efficiency. Elapsed time is computed in real-time.
  4. **Strict State-Machine Progression (`PATCH /api/kds/orders/:id/status`):** Enforces linear transitions: `ACCEPTED` → `PREPARING` → `READY` → `SERVED`. Invalid transitions (e.g. jumping `ACCEPTED` to `SERVED`, or advancing cancelled/served tickets) are rejected with HTTP 400 `InvalidTransition`. Served orders automatically drop out of the active kitchen queue.
  5. **Immutable Audit Trail:** Every status change is recorded in `order_status_history` with previous status, new status, staff user ID, timestamp, and context notes.
  6. **Web Interfaces:** Dedicated cashier POS (`/pos`) and dark-theme high-contrast kitchen terminal (`/kds`) interfaces created in `@katha-cafe/web`.
- **Dependencies Added:** None (built with existing monorepo dependencies).
- **Reason:** Fulfills PRD Section 4.5 & 4.6, guarantees clear segregation between customer orders, cashier review, and kitchen fulfillment, and prevents orphaned or skipped kitchen tickets.
- **Status:** Accepted and verified in Phase 6.

## D-015 — Counter payment recording, idempotency enforcement, and partial unique constraint
- **Decision:**
  1. **Counter-Only Settlement Scope:** In adherence to the zero-cost/free baseline, no paid payment gateways (Razorpay, Paytm, Stripe) or bank subscriptions are integrated. Payments are verified in person by authorized staff (`CASHIER`, `MANAGER`, `ADMIN`) via `CASH`, `UPI_AT_COUNTER` (cashier verifies customer's UPI app payment to cafe's QR standee and optionally records UTR reference), or `CARD_AT_COUNTER`.
  2. **Partial Unique Constraint Protection:** Database partial unique index `idx_payments_order_paid` (`UNIQUE (order_id) WHERE status = 'PAID'`) strictly prevents double-billing and concurrent multi-tab race conditions. Only at most ONE successful `PAID` record can exist per order.
  3. **Payment Idempotency:** Submissions require an `idempotencyKey`. Retrying with the same key returns the existing settlement receipt (`200 OK` with `isExisting: true`). Submitting a new payment attempt for an already paid order returns `409 Conflict` (`OrderAlreadyPaid`).
  4. **Server-Authoritative Settlement:** The server alone transitions payments to `PAID` upon staff verification, updates the order status to `CLOSED`, and logs the settlement event in `order_status_history`. Underpayments are strictly rejected.
  5. **UI Protection:** The cashier settlement action immediately disables upon first click (`isProcessingPayment = true`), preventing accidental double submissions.
- **Dependencies Added:** None (uses existing database layer and Express routes).
- **Reason:** Fulfills PRD Section 4.7, eliminates double-charging risks without third-party fees, and guarantees accounting reconciliation integrity.
- **Status:** Accepted and verified in Phase 7.

## D-016 — Inventory stock tracking, manual adjustments audit trail, and verified-only sales reporting & reconciliation
- **Decision:**
  1. **Manual-Only Stock Adjustments & No Automatic Recipe Deductions:** In adherence to the owner operating constraints and Risk R-07, automatic ingredient deductions per menu item are strictly disabled until full recipe formulations are approved by the café owner. All stock movements (`PURCHASE`, `ADJUSTMENT`, `WASTE`, `RETURN`) are recorded manually by authorized managers or admins with a mandatory reason and actor auditing.
  2. **Negative Stock Prevention:** Stock adjustments that would cause `quantity < 0` are rejected by the server with HTTP 400 `NegativeStockError`.
  3. **Low Stock Threshold Alerting:** When an item's quantity reaches or drops below its `reorder_level`, the item is flagged with `isLowStock: true`, triggering immediate alerts on the admin dashboard.
  4. **Strict Sales Accounting & Reconciliation:** Sales reports (`/api/admin/reports/sales/daily`, `/api/admin/reports/sales/product-mix`, `/api/admin/reports/reconciliation`) strictly query orders with `status = 'CLOSED'` that possess a verified `PAID` payment. Abandoned carts, unverified orders, and cancelled/rejected tickets are filtered out to ensure 100% accounting fidelity and bank reconciliation.
  5. **Admin Web Dashboard:** Created responsive management screen at `/admin` in `@katha-cafe/web` with stock alert counters, item creation modal, stock adjustment drawer, and revenue breakdown widgets.
- **Dependencies Added:** None (built with existing monorepo stack).
- **Reason:** Fulfills PRD Sections 4.8 & 4.9, satisfies Phase 8 acceptance criteria, and guarantees stock and cash reconciliation accuracy.
- **Status:** Accepted and verified in Phase 8.




