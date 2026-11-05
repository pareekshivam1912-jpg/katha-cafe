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
