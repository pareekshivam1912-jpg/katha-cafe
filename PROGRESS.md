# Progress — Katha Cafe

Last updated: 2026-11-05

| Phase | Name | Status | Notes |
|---:|---|---|---|
| 0 | Documentation baseline | done | Markdown specification pack created; initial baseline committed |
| 1 | Repository/local foundation | done | Monorepo initialized, pinned dependencies installed, health check API running, tests passing |
| 2 | Database/authentication | done | PostgreSQL schema migrations, dual-mode PGlite/pg client, scrypt password hashing, MOCK seed data, and RBAC auth tested |
| 3 | Menu/public website | todo | Blocked by Phase 2 approval; menu price conflicts require owner confirmation |
| 4 | Tables/QR/customer details | todo | Blocked by prior phases |
| 5 | QR ordering | todo | Blocked by prior phases |
| 6 | POS/KDS | todo | Blocked by prior phases |
| 7 | Counter payment recording | todo | No online gateway included |
| 8 | Inventory/reports | todo | Recipe mappings require owner data |
| 9 | Hardening/release | todo | Hosting not selected |

## Verification evidence

- Phase 0: Documentation files generated, packaged, and committed in initial baseline commit (`docs(phase-0)`).
- Phase 1: Git repository initialized in `D:\CAFE\KathaCafeDocs`. Monorepo created with npm workspaces. Pinned dependencies installed from lockfile. TypeScript built to `packages/api/dist`. Vitest unit and HTTP integration tests executed and passing (2/2 passing). GET `/api/health` verified with 200 OK response returning status, uptime, environment, and ISO timestamp.
- Phase 2: PostgreSQL schema migration `001_initial_schema.sql` created in `@katha-cafe/db`. Dual-mode PGlite/pg client created. Database constraints (unique username, role check, and partial unique index on payments) tested. Built-in `crypto.scrypt` password hashing and verification implemented. MOCK staff accounts (`admin_mock`, `manager_mock`, `cashier_mock`, `kitchen_mock`) seeded and clearly labelled. Auth router (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`) and RBAC middleware (`requireAuth`, `requireRole`) implemented and tested (19/19 tests passing across workspace).
