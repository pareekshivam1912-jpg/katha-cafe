# Progress — Katha Cafe

Last updated: 2026-11-05

| Phase | Name | Status | Notes |
|---:|---|---|---|
| 0 | Documentation baseline | done | Markdown specification pack created; initial baseline committed |
| 1 | Repository/local foundation | done | Monorepo initialized, pinned dependencies installed, health check API running, tests passing |
| 2 | Database/authentication | done | PostgreSQL schema migrations, dual-mode PGlite/pg client, scrypt password hashing, MOCK seed data, and RBAC auth tested |
| 3 | Menu/public website | done | Canonical menu imported (23 categories, 119 items), menu CRUD and price auditing tested, Next.js responsive website built |
| 4 | Tables/QR/customer details | done | Opaque QR tokens, SHA-256 token hashing, table session lifecycle, 10-digit Indian mobile validation, Next.js /order page |
| 5 | QR ordering | done | Server recalculation, idempotency deduplication, transactional line item snapshotting, status token hash |
| 6 | POS/KDS | done | Cashier order entry, QR order review & acceptance, KDS queue & linear state progression, audit trail |
| 7 | Counter payment recording | todo | Blocked by Phase 6 approval |
| 8 | Inventory/reports | todo | Recipe mappings require owner data |
| 9 | Hardening/release | todo | Hosting not selected |

## Verification evidence

- Phase 0: Documentation files generated, packaged, and committed in initial baseline commit (`docs(phase-0)`).
- Phase 1: Git repository initialized in `D:\CAFE\KathaCafeDocs`. Monorepo created with npm workspaces. Pinned dependencies installed from lockfile. TypeScript built to `packages/api/dist`. Vitest unit and HTTP integration tests executed and passing (2/2 passing). GET `/api/health` verified with 200 OK response returning status, uptime, environment, and ISO timestamp.
- Phase 2: PostgreSQL schema migration `001_initial_schema.sql` created in `@katha-cafe/db`. Dual-mode PGlite/pg client created. Database constraints (unique username, role check, and partial unique index on payments) tested. Built-in `crypto.scrypt` password hashing and verification implemented. MOCK staff accounts (`admin_mock`, `manager_mock`, `cashier_mock`, `kitchen_mock`) seeded and clearly labelled. Auth router (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) and RBAC middleware (`requireAuth`, `requireRole`) implemented and tested (19/19 tests passing across workspace).
- Phase 3: Canonical menu data transcribed and seeded from `menu.md` across 23 categories and 119 items with integer paise prices. Confirmed prices applied for 4 flagged items. Menu REST API (`/api/menu`, `/api/menu/categories`, `/api/admin/menu/items`, `/api/admin/menu/items/:id/price`) implemented and tested with price change auditing. Next.js 15 responsive website built in `@katha-cafe/web` with Katha Cafe brand tokens (forest green, warm ivory, antique gold). All 25 workspace tests passing.
- Phase 4: Opaque 32-byte QR token generator and SHA-256 hash lookup implemented. Table resolution endpoint (`/api/tables/resolve/:token`) tested without ID leakage. Customer identification endpoint (`/api/table-sessions/identify-customer`) validating names and Indian mobile numbers (E.164 normalization). Table session closure enforcement tested. Next.js customer ordering entry page (`/order?token=...`) created and built. All 30 workspace tests passing.
- Phase 5: Server-authoritative order placement (`POST /api/orders`) implemented with zero trust for client prices. Line items transactional snapshot (`orders`, `order_items`, `order_status_history`). Idempotency key deduplication tested with identical order recovery. Unavailable item rejection and closed session rejection verified. Public 32-byte status token SHA-256 hash lookup (`GET /api/orders/:publicToken/status`) tested. All 31 workspace tests passing.
- Phase 6: Staff POS order creation (`POST /api/pos/orders`) implemented with server recalculation and immediate `ACCEPTED` state. Cashier QR review queue (`GET /api/pos/orders/pending`), accept (`POST /api/pos/orders/:id/accept`), and reject (`POST /api/pos/orders/:id/reject`) with mandatory reason implemented. Kitchen Display System (KDS) queue (`GET /api/kds/orders`) and linear state machine (`PATCH /api/kds/orders/:id/status` advancing `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`) implemented with financial data omission from kitchen view and audit logging in `order_status_history`. Web interfaces built for `/pos` and `/kds`. All 45 workspace tests passing.
