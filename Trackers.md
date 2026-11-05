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
| DEV-01 | 1 | Inspect/create repository foundation | Todo | Await Phase 1 approval |
| DEV-02 | 2 | Implement schema/auth | Todo | Blocked by Phase 1 |
| DEV-03 | 3 | Menu/public website | Todo | Confirm prices first |
| DEV-04 | 4 | Table QR/customer details | Todo | — |
| DEV-05 | 5 | QR ordering | Todo | — |
| DEV-06 | 6 | POS/KDS | Todo | — |
| DEV-07 | 7 | Counter payment recording | Todo | No gateway |
| DEV-08 | 8 | Inventory/reports | Todo | Recipe data pending |
| DEV-09 | 9 | Hardening/release | Todo | Hosting decision pending |

## 2. Decision tracker

See `DECISIONS.md`. Add date, decision, alternatives, cost/license check and approval status for each new choice.

## 3. Risk tracker

| ID | Risk | Impact | Mitigation | Status |
|---|---|---|---|---|
| R-01 | Menu screenshots contain conflicting prices | Wrong customer bill | Owner confirms canonical price before import | Open |
| R-02 | Tax/GST treatment not confirmed | Incorrect totals/receipts | Do not hardcode tax; confirm with owner/accountant | Open |
| R-03 | Bank has no free server verification API | Cannot automate online UPI confirmation | Counter verification, mock flow or approved bank route | Open |
| R-04 | Free hosting requires card or can bill | Unexpected charge | Local-first; verify terms before selection | Open |
| R-05 | Duplicate order/payment retries | Double billing | Idempotency keys, transactions and unique constraints | Planned |
| R-06 | Customer phone number exposure | Privacy harm | Least privilege, limited retention, no telemetry | Planned |
| R-07 | Recipes not supplied | Incorrect stock deduction | No automated ingredient deduction until approved | Open |

## 4. Test tracker

| Test ID | Area | Scenario | Expected result | Status |
|---|---|---|---|---|
| T-01 | QR | Invalid token | Reject; no table/order data disclosed | Todo |
| T-02 | Customer | Invalid mobile | Validation error | Todo |
| T-03 | Menu | Item disabled after cart load | Server rejects stale item | Todo |
| T-04 | Orders | Double submit | One order only | Todo |
| T-05 | Orders | Refresh after submit | Existing order recovered | Todo |
| T-06 | Payments | Double click | One payment attempt/success | Todo |
| T-07 | Payments | Retry same idempotency key | Same attempt returned | Todo |
| T-08 | Payments | Two tabs race | At most one PAID record | Todo |
| T-09 | Payments | Client claims success | Server remains non-paid until verified | Todo |
| T-10 | Roles | Kitchen accesses admin route | Forbidden | Todo |
| T-11 | KDS | Reconnect | No duplicate ticket | Todo |
| T-12 | Backup | Restore backup | Data restored in test database | Todo |

## 5. Change log

| Date | Phase | Change | Verified by |
|---|---:|---|---|
| 2026-11-05 | 0 | Initial documentation package generated from supplied requirements and menu screenshots | File/package verification |
