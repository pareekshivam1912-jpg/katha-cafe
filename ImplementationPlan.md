# Implementation Plan — Katha Cafe

## Delivery approach

Execute phases strictly in order. Each phase must be implemented, run, tested, documented, committed and explicitly approved before the next phase starts. Do not combine phases.

## Phase 0 — Documentation baseline
**Status: DONE for this documentation package only.**
- Define scope, requirements, workflows, schema proposal and menu transcription.
- Record constraints and unresolved decisions.
- No application code is included in this phase.

## Phase 1 — Repository and local development foundation
- Confirm project repository and existing files.
- Read `rules.md` before each task.
- Verify free-only toolchain, licenses, versions and no-card/no-billing constraints.
- Initialize only the approved project structure.
- Add `.gitignore`, `.env.example`, README and local run instructions.
- Set up local PostgreSQL and a minimal health endpoint only if approved.
- Verification: install from lockfile, run app/API, run tests, show command and output.
- Exit gate: clean local startup, tests pass, no secrets committed, one phase commit.

## Phase 2 — Database and authentication
- Implement migrations for approved schema subset.
- Add staff login, password hashing, session handling and role checks.
- Seed clearly labelled MOCK staff/menu data.
- Verification: migrations, login tests, role authorization tests and database constraints.
- Exit gate: unauthorized access tests pass; no production credentials.

## Phase 3 — Menu and public website
- Implement category/item administration and public menu display.
- Import menu from `menu.md` only after owner confirms flagged price conflicts.
- Build public café pages using approved content and supplied brand direction.
- Verification: menu totals, availability toggles, responsive checks and admin permission tests.

## Phase 4 — Tables, QR codes and customer details
- Implement table management, opaque QR tokens and table sessions.
- Customer name/mobile form and validation.
- Generate QR codes locally.
- Verification: valid/invalid/disabled QR, token leakage checks, session close tests.

## Phase 5 — QR ordering and order lifecycle
- Implement cart, server-side price calculation, order submission and status lookup.
- Add idempotent order submission and order status history.
- Verification: stale prices, unavailable item, retry, refresh, double submit and two-tab tests.

## Phase 6 — POS and kitchen display
- Implement staff order entry, QR order review, POS queue and KDS.
- Add authenticated realtime updates or polling only after choosing the simplest free/local option.
- Verification: one order appears once, state transitions, reconnect handling and role permissions.

## Phase 7 — Cashier payment recording and reconciliation
- Implement cash and cashier-verified UPI-at-counter recording.
- Enforce idempotency and one successful payment per order.
- No online gateway, real-money test or bank API integration.
- Verification: double click, retry, refresh, back button, two tabs, concurrent requests and manual audit history.
- Exit gate: database constraints and server-side payment status verified.

## Phase 8 — Inventory and reports
- Implement inventory records, stock movements and reports.
- Recipe-based deduction remains excluded until owner-approved recipe data exists.
- Verification: stock adjustment audit, report totals reconcile with order records.

## Phase 9 — Hardening, backup and release readiness
- Security review, accessibility and responsive checks.
- Backup/restore test on a separate database.
- Performance checks on local hardware.
- Confirm deployment cost and card requirements before any hosting choice.
- No deployment without explicit approval.

## Phase gate rule

At the end of each phase:
1. Summarize exact files and behavior changed.
2. Show test commands and actual output.
3. List failures, mocks and untested cases.
4. Update `PROGRESS.md`, `README.md` and `DECISIONS.md`.
5. Commit one working state for that phase.
6. Stop and wait for the user's “go ahead”.
