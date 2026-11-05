# Technical Specification — Katha Cafe

## 1. Technical principles

- Free-only, open-source-first, local-first.
- No card-required trials, paid APIs, usage-billed APIs or auto-renewing services.
- No analytics or telemetry.
- Server is authoritative for prices, permissions, order state and payment state.
- One PostgreSQL database is the source of truth for website, QR ordering, POS and kitchen.
- Do not introduce dependencies without recording reason, license and pinned version in `DECISIONS.md`.

## 2. Proposed stack (subject to verification before installation)

| Layer | Proposed technology | License | Intended use |
|---|---|---|---|
| Web UI | Next.js | MIT | Public site, customer ordering, POS/admin |
| UI library | React | MIT | Interactive UI |
| Styling | Tailwind CSS | MIT | Utility-first styling |
| API | Node.js + Express | Node.js: MIT; Express: MIT | REST API and server logic |
| Database | PostgreSQL | PostgreSQL License | Durable relational storage |
| Realtime | Socket.IO | MIT | Kitchen/POS order updates |
| Validation | Zod | MIT | Request and form validation |
| Password hashing | argon2 package | MIT | Password hashing |
| QR generation | `qrcode` | MIT | Table QR image generation |
| Tests | Vitest | MIT | Unit/integration tests |
| Browser tests | Playwright | Apache-2.0 | End-to-end tests |

**Version policy:** no package versions are installed or implied by this document. Before Phase 1 implementation, verify current stable versions, maintenance status, Node compatibility and exact licenses; pin exact versions in package manifests and record them in `DECISIONS.md`. Do not use `latest` in a lockfile.

## 3. Deployment model

### Development
- Run the web app, API and PostgreSQL locally.
- Use mock seed data clearly labelled MOCK.
- Do not expose local services publicly.
- Back up the local database before migrations or destructive test resets.

### Production
Production hosting is not selected. A free tier is not automatically acceptable: reject it if it requires a card, has usage billing, auto-upgrades or can incur charges. Before selecting hosting, compare local/on-premises operation and verified no-card free options. Do not deploy until the owner approves the exact provider and limits.

## 4. Application boundaries

- `web`: public website, QR customer interface, POS and admin screens.
- `api`: authentication, menu, table sessions, orders, payment records, inventory and reports.
- `db`: PostgreSQL schema and migrations.
- `realtime`: authenticated Socket.IO events for accepted order and kitchen status updates.
- `local-files`: generated QR assets and local backups; never store secrets here.

## 5. API outline

All endpoints require schema validation. Admin endpoints require role authorization.

### Public/menu
- `GET /api/menu`
- `GET /api/menu/categories`

### QR/table
- `GET /api/tables/resolve/:token`
- `POST /api/table-sessions`
- `POST /api/table-sessions/:id/orders`
- `GET /api/orders/:publicToken/status`

### POS/orders
- `POST /api/orders` — staff-created order
- `GET /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/status`
- `POST /api/orders/:id/cancel`

### Authentication/admin
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- CRUD routes for staff, menu categories, menu items, tables and inventory.

### Payments (initially no online provider)
- `POST /api/orders/:id/payments` — record a cashier-verified payment.
- `GET /api/orders/:id/payment-status`
- `POST /api/payments/:id/manual-verify` — privileged staff action with audit log.

Do not expose a public endpoint that allows the browser to mark an order paid.

## 6. Order lifecycle

Suggested states:

`DRAFT → SUBMITTED → ACCEPTED → PREPARING → READY → SERVED → CLOSED`

Alternative terminal states: `REJECTED`, `CANCELLED`.

- QR order begins SUBMITTED.
- Staff acceptance moves it to ACCEPTED.
- Kitchen moves it through PREPARING and READY.
- Staff marks SERVED; cashier closes after settlement.
- Every transition is validated server-side and written to `order_status_history`.
- Invalid transitions return a conflict response.

## 7. Payment lifecycle

Initial methods: CASH and UPI_AT_COUNTER (recorded by cashier after checking the merchant bank app/statement). CARD may be recorded only if the café has an existing terminal and owner confirms.

States: `PENDING`, `PAID`, `FAILED`, `VOIDED`, `REFUND_PENDING`, `REFUNDED`.

Rules:
- Unique idempotency key per payment request.
- Unique successful payment per order.
- Database transaction and unique constraints protect against races.
- Server-side manual verification is required for counter UPI.
- Record verifier, time, amount and bank reference where available.
- A browser action never sets PAID.
- No real-money online payment code in the initial phase.
- Future bank integration requires a verified bank/acquirer sandbox and a server-authenticated callback/status API. If no free option exists, stop and present alternatives.

## 8. Realtime events

Suggested event names:
- `order:submitted`
- `order:accepted`
- `order:status_changed`
- `kitchen:ticket_updated`
- `menu:availability_changed`

Authenticate socket connections and authorize rooms by role/table/order token. Never broadcast customer phone numbers to kitchen clients unless operationally necessary; default is not to expose them.

## 9. Security and privacy

- Hash staff passwords with a maintained password-hashing library.
- Use secure, HttpOnly, SameSite cookies for browser sessions where feasible.
- Apply CSRF protection to cookie-authenticated mutations.
- Rate-limit login and public order submission using local application controls; do not add a paid rate-limit service.
- Validate and normalize Indian mobile numbers.
- Use opaque, high-entropy table and order tokens.
- Avoid logging passwords, tokens, phone numbers or payment secrets.
- Restrict customer PII to authorized staff.
- Keep `.env` out of Git; commit `.env.example` with placeholders only.
- Use parameterized SQL/ORM queries.
- Keep audit records for menu price changes, cancellations, payment verification and stock adjustments.

## 10. Backups and recovery

- Provide a documented local PostgreSQL backup and restore procedure.
- Do not run destructive migration/reset commands without explicit approval and a backup.
- Verify restore on a separate test database before calling backups usable.
- No cloud backup service is selected; external storage requires a privacy and cost review.

## 11. Testing requirements

- Unit tests for totals, validations and state transitions.
- Integration tests for database constraints and API authorization.
- End-to-end tests for QR ordering and POS-to-kitchen workflow.
- Concurrency tests for duplicate submissions and payment idempotency.
- Test refresh, back navigation, slow network, double-click and two-tab payment attempts.
- Use MOCK data and local test database only.
