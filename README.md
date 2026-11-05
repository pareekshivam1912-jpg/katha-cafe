# Katha Cafe — Project Documentation

This repository documentation defines the Katha Cafe website, QR table ordering, point-of-sale (POS), kitchen display, inventory and reporting project.

## Documentation index

- [PRD.md](PRD.md) — product requirements and scope
- [TechSpec.md](TechSpec.md) — architecture, stack and technical constraints
- [AppFlow.md](AppFlow.md) — customer and staff workflows
- [Schema.md](Schema.md) — proposed relational database schema
- [menu.md](menu.md) — menu transcribed from supplied café menu screenshots
- [ImplementationPlan.md](ImplementationPlan.md) — delivery plan
- [Phase.md](Phase.md) — phase gates, acceptance criteria and verification
- [Trackers.md](Trackers.md) — task, risk, test and decision trackers
- [rules.md](rules.md) — mandatory project operating rules
- [PROGRESS.md](PROGRESS.md) — current phase status
- [DECISIONS.md](DECISIONS.md) — architecture and scope decisions

## Current project status

- **Phase 0 (Documentation baseline):** Done.
- **Phase 1 (Repository and local development foundation):** Done. Git repository initialized, npm workspaces monorepo configured, pinned dependencies installed from lockfile, TypeScript built, health endpoint and tests verified.
- **Phase 2 (Database and authentication):** Done. PostgreSQL schema migrations (`001_initial_schema.sql`), dual-mode PGlite/pg client, scrypt password hashing, MOCK staff accounts, and RBAC auth routes (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`) implemented and verified (19/19 tests passing).
- **Phase 3 (Menu and public website):** Done. Canonical menu imported from `menu.md` (23 categories, 119 items with integer paise prices), price change auditing and availability toggling tested, Next.js 15 responsive website built in `@katha-cafe/web` matching brand tokens. All 25 workspace tests passing.
- **Phase 4 (Tables, QR codes and customer details):** Done. Opaque 32-byte table tokens, SHA-256 hash lookup in database, zero token/ID leakage, 10-digit Indian mobile validation with E.164 normalization, session closure enforcement, and Next.js customer ordering entry page (`/order`). All 30 workspace tests passing.
- **Phase 5 (QR cart ordering and order lifecycle):** Done. Server-authoritative price recalculation, order placement idempotency (`orders.idempotency_key`), transactional line item snapshotting, and public status token SHA-256 hash lookup (`/api/orders/:publicToken/status`). All 31 workspace tests passing.
- **Phase 6 (POS and Kitchen Display System):** Done. Staff POS order creation (`/api/pos/orders`), Cashier incoming QR order review & accept/reject (`/api/pos/orders/pending`), Kitchen Display System queue (`/api/kds/orders`), linear state machine progression (`ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`), and Next.js `/pos` and `/kds` responsive web interfaces. All 45 workspace tests passing.
- **Phase 7 (Counter Payment Recording & Reconciliation):** Done. Counter payment recording (`/api/pos/orders/:id/payments`) supporting `CASH`, `UPI_AT_COUNTER`, and `CARD_AT_COUNTER`, partial unique index constraint (`idx_payments_order_paid`), idempotency deduplication, underpayment prevention, and Cashier settlement UI. All 55 workspace tests passing.
- **Phases 8–9:** Todo. Blocked pending sequential approval.

## Local development instructions

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Getting started
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies (frozen/pinned lockfile):
   ```bash
   npm install
   ```
3. Run complete test suite:
   ```bash
   npm test
   ```
4. Build all packages (API, DB, and Web):
   ```bash
   npm run build
   ```
5. Start development servers:
   - Backend API: `npm --workspace=@katha-cafe/api run dev` (runs on http://localhost:4000)
   - Public Website: `npm --workspace=@katha-cafe/web run dev` (runs on http://localhost:3000)

## Café details supplied for this project

- Name: Katha Cafe
- Address: B-82A Ganga Jamuna Colony, Dadi Ka Phatak, Murlipura, Jaipur, Rajasthan 302039
- Phone: 074270 45840
- Menu type: vegetarian
- Brand direction: forest green, warm ivory, antique gold, botanical line art and editorial serif typography
- Instagram handle shown in supplied menu: `@katha.jaipur`

Business details and menu prices should be confirmed by the café owner before public launch. The menu transcription includes source inconsistencies documented in `menu.md`.

## Free-only operating baseline

Development should run locally with free/open-source software. Do not select a hosted service, bank API, payment provider, domain, SMS/WhatsApp service or other product until its cost, card requirement, usage limits and terms have been checked and approved. Local development does not imply free production hosting.
