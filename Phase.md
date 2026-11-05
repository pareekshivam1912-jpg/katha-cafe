# Phase Gates and Acceptance Checklist

## Global gate
- [ ] `rules.md` read before the task.
- [ ] Free limits, license and card requirement verified before tool/service use.
- [ ] No unapproved scope, dependency or refactor.
- [ ] No secrets in source control.
- [ ] No telemetry or third-party data sharing.
- [ ] Tests run; command and actual output recorded.
- [ ] README, PROGRESS and DECISIONS updated.
- [ ] One commit created for the phase.
- [ ] User approval received before next phase.

## Phase 0 — Documentation baseline
- [x] PRD, technical specification, app flow, schema proposal and menu documentation created.
- [x] Project phases and operational rules documented.
- [x] Design file intentionally excluded as requested.
- [ ] Owner validates menu discrepancies and tax policy.
- [x] User approves moving to Phase 1.

## Phase 1 — Repository/local foundation
- [x] Repository location confirmed.
- [x] Existing files inspected; no overwrite without approval.
- [x] Toolchain and exact licenses verified.
- [x] Dependencies pinned.
- [x] Local app/API starts successfully.
- [x] Tests pass and output recorded.
- [x] Phase commit created.

## Phase 2 — Database/auth
- [x] Approved migrations apply cleanly.
- [x] MOCK seed data labelled.
- [x] Login and logout tested.
- [x] Role authorization tested.
- [x] No secrets committed.
- [x] Phase commit created.

## Phase 3 — Menu/public site
- [ ] Owner confirms authoritative menu prices.
- [ ] Menu CRUD permissions tested.
- [ ] Public menu reads from database.
- [ ] Unavailable items cannot be ordered.
- [ ] Responsive checks pass.
- [ ] Phase commit created.

## Phase 4 — QR/table
- [ ] Unique opaque QR token per table.
- [ ] Customer name and mobile validation.
- [ ] Invalid/closed QR rejected.
- [ ] No guessable table identifiers exposed.
- [ ] Phase commit created.

## Phase 5 — QR orders
- [ ] Server recalculates prices and totals.
- [ ] Order creation is transactional.
- [ ] Retry returns same order.
- [ ] Duplicate submissions tested.
- [ ] Status token access tested.
- [ ] Phase commit created.

## Phase 6 — POS/KDS
- [ ] Staff can create orders.
- [ ] QR order acceptance/rejection works.
- [ ] Kitchen queue receives accepted order once.
- [ ] Status transitions and audit history work.
- [ ] Reconnect behavior tested.
- [ ] Phase commit created.

## Phase 7 — Payments
- [ ] Counter-only payment recording scope confirmed.
- [ ] Idempotency key required.
- [ ] Pay/confirm control disables after first click.
- [ ] Unique successful payment constraint tested.
- [ ] Server alone sets PAID.
- [ ] Double click, retry, refresh, back button and two tabs tested.
- [ ] No real-money gateway integration.
- [ ] Phase commit created.

## Phase 8 — Inventory/reports
- [ ] Stock movement audit works.
- [ ] No recipe deduction without approved recipes.
- [ ] Report totals reconcile.
- [ ] Phase commit created.

## Phase 9 — Hardening/release
- [ ] Backup and restore tested.
- [ ] Security and accessibility checks complete.
- [ ] Hosting cost/card requirement reviewed.
- [ ] Deployment explicitly approved.
- [ ] Phase commit created.
