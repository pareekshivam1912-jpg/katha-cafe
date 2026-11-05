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
