# Project Trackers — Katha Cafe

Update this file as work proceeds. Do not mark an item complete without evidence.

## 1. Task tracker

| ID | Phase | Task | Status | Evidence/notes |
|---|---:|---|---|---|
| DOC-01 | 0 | Create project requirements | Done | `PRD.md` |
| DOC-02 | 0 | Create technical specification | Done | `TechSpec.md` |
| DOC-03 | 0 | Document app workflows | Done | `AppFlow.md` |
| DOC-04 | 0 | Propose database schema | Done | `Schema.md` |
| DOC-05 | 0 | Transcribe menu and prices | Done with discrepancies | `menu.md` |
| DOC-06 | 0 | Define phases and rules | Done | `Phase.md`, `rules.md` |
| DEV-01 | 1 | Inspect/create repository foundation | Done | Git repo, npm workspaces, health endpoint, tests passing |
| DEV-02 | 2 | Implement schema/auth | Done | Migration 001, dual-mode client, scrypt auth, RBAC tests passing |
| DEV-03 | 3 | Menu/public website | Done | Canonical menu seeded (119 items), menu API & Next.js website built |
| DEV-04 | 4 | Table QR/customer details | Done | Opaque tokens, SHA-256 hash, phone validation, Next.js /order page |
| DEV-05 | 5 | QR ordering | Done | Server recalculation, idempotency, transactional snapshotting, orders.test.ts passing |
| DEV-06 | 6 | POS/KDS | Done | POS order creation, QR order review & acceptance, KDS queue & linear progression, pos-kds.test.ts passing |
| DEV-07 | 7 | Counter payment recording | Done | Counter payment recording, idempotency, partial unique index, payments.test.ts passing |
| DEV-08 | 8 | Inventory/reports | Done | Inventory tracking, movements audit, low-stock alerts, daily sales reports, inventory-reports.test.ts passing |
| DEV-09 | 9 | Hardening/release | Done | Backup/restore tested (T-12), security defense-in-depth headers, production build across monorepo |

## 2. Decision tracker

See `DECISIONS.md`. Add date, decision, alternatives, cost/license check and approval status for each new choice.

## 3. Risk tracker

| ID | Risk | Impact | Mitigation | Status |
|---|---|---|---|---|
| R-01 | Menu screenshots contain conflicting prices | Wrong customer bill | Owner confirms canonical price before import | Resolved (Category page prices confirmed) |
| R-02 | Tax/GST treatment not confirmed | Incorrect totals/receipts | Do not hardcode tax; confirm with owner/accountant | Open |
| R-03 | Bank has no free server verification API | Cannot automate online UPI confirmation | Counter verification, mock flow or approved bank route | Open |
| R-04 | Free hosting requires card or can bill | Unexpected charge | Local-first; verify terms before selection | Resolved (Local-first deployment on cafe PC via PM2/Docker verified zero cost) |
| R-05 | Duplicate order/payment retries | Double billing | Idempotency keys, transactions and unique constraints | Resolved (Order & payment idempotency and partial unique index verified) |
| R-06 | Customer phone number exposure | Privacy harm | Least privilege, limited retention, no telemetry | Resolved (Phone numbers omitted from public status lookups; restricted to authenticated staff) |
| R-07 | Recipes not supplied | Incorrect stock deduction | No automated ingredient deduction until approved | Resolved (Automatic deductions disabled per owner instruction; manual movements audited) |

## 4. Test tracker

| Test ID | Area | Scenario | Expected result | Status |
|---|---|---|---|---|
| T-01 | QR | Invalid token | Reject; no table/order data disclosed | Done |
| T-02 | Customer | Invalid mobile | Validation error | Done |
| T-03 | Menu | Item disabled after cart load | Server rejects stale item | Done |
| T-04 | Orders | Double submit | One order only | Done |
| T-05 | Orders | Refresh after submit | Existing order recovered | Done |
| T-06 | Payments | Double click | One payment attempt/success | Done |
| T-07 | Payments | Retry same idempotency key | Same attempt returned | Done |
| T-08 | Payments | Two tabs race | At most one PAID record | Done |
| T-09 | Payments | Client claims success | Server remains non-paid until verified | Done |
| T-10 | Roles | Kitchen accesses admin route | Forbidden | Done |
| T-11 | KDS | Reconnect | No duplicate ticket | Done |
| T-12 | Backup | Restore backup | Data restored in test database | Done |


## 5. Change log

| Date | Phase | Change | Verified by |
|---|---:|---|---|
| 2026-11-05 | 0 | Initial documentation package generated from supplied requirements and menu screenshots | File/package verification |
| 2026-11-05 | 1 | Monorepo initialized with npm workspaces, pinned dependencies, health API, Vitest | Test execution & build |
| 2026-11-05 | 2 | PostgreSQL schema migrations, dual-mode client, scrypt password hashing, MOCK seed data, RBAC | Test execution & build |
| 2026-11-05 | 3 | Canonical menu imported (23 categories, 119 items), menu CRUD, price auditing, Next.js site | Test execution & build |
| 2026-11-05 | 4 | Opaque QR tokens, SHA-256 hashing, session lifecycle, phone validation, Next.js /order page | Test execution & build |
| 2026-11-05 | 5 | Server price recalculation, order idempotency, transactional line items, status token lookup | Test execution & build |
| 2026-11-05 | 6 | Cashier POS order entry, QR order review & acceptance, KDS queue & linear progression, web UI | Test execution & build |
| 2026-11-05 | 7 | Counter payment recording, idempotency, partial unique index, double-click protection, web UI | Test execution & build |
| 2026-11-05 | 8 | Inventory tracking, movements audit, low-stock alerts, daily sales reporting, web admin UI | Test execution & build |
| 2026-11-05 | 9 | Database backup & restore utility, security defense-in-depth headers, production build across monorepo | Test execution & build |
