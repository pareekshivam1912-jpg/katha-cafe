# Product Requirements Document — Katha Cafe

## 1. Product overview

Build a café website and internal restaurant operations system for Katha Cafe. The system has three connected surfaces:

1. **Public website:** café information, menu, location and contact details.
2. **Customer QR ordering:** guests scan a table QR code, identify themselves, browse the menu and place an order.
3. **Staff operations:** POS billing, order management, kitchen display, menu control, inventory and reports.

All surfaces use one backend and one source of truth for menu, orders, tables and payment state.

## 2. Goals

- Let customers view the current menu and prices on mobile.
- Allow table-based QR ordering without requiring an app installation or customer account.
- Capture customer name and mobile number for each QR order.
- Let staff create and manage dine-in, takeaway and counter orders.
- Route accepted orders to the kitchen in real time.
- Prevent duplicate orders and duplicate payment processing.
- Let authorized staff manage menu availability, tables and order status.
- Provide useful operational reports without third-party analytics or telemetry.
- Keep the first implementation local-first and free-only.

## 3. Users and roles

| Role | Main permissions |
|---|---|
| Owner/Admin | Manage staff, menu, prices, tables, settings, reports and inventory |
| Manager | Manage orders, menu availability, tables, refunds/cancellations and stock |
| Cashier | Create bills, accept QR orders, record permitted payment outcomes and print receipts |
| Kitchen Staff | View accepted kitchen tickets and update preparation status |
| Customer | View menu, submit contact details, place an order and view that order's status |

Enforce permissions on the server, not only by hiding UI controls.

## 4. Functional requirements

### 4.1 Public website
- Show café name, vegetarian positioning, address, phone, operating hours when confirmed, menu and contact/location links.
- Use mobile-first responsive layouts.
- Do not publish unverified opening hours, offers or menu availability.
- Do not represent the site as an official government or third-party platform.

### 4.2 Menu
- Menu items belong to categories.
- Each item has name, price in INR paise, availability, description (optional) and display order.
- Admin/Manager can enable or disable items.
- Prices shown to customers and staff must come from the server-side menu record.
- Preserve the supplied menu names and prices in `menu.md`; resolve discrepancies with the owner before production.

### 4.3 QR table ordering
- Each physical table has a unique QR code containing an opaque table token, not a guessable sequential table ID.
- Scanning opens a mobile web ordering page.
- Customer must enter full name and a valid 10-digit Indian mobile number before submitting an order.
- Table is resolved from the QR token and displayed as read-only.
- Customer can add/remove items and change quantities before submission.
- Server validates item availability and calculates totals.
- Customer receives an order reference and can view status.
- Customer does not need a password or app installation.
- A customer may submit more than one order during an active table session; each order remains separately identifiable.
- Staff can close a table session. A closed/invalid token cannot create a new order.

### 4.4 POS and order management
- Cashier can create dine-in, takeaway and counter orders.
- Cashier can review and accept/reject QR orders.
- One order record is shared by POS, customer status page and kitchen display.
- Authorized staff can update order statuses with an audit trail.
- Cancellation requires a reason and authorized role.
- No order or payment is deleted to hide an operational mistake.

### 4.5 Kitchen Display System
- Kitchen sees accepted orders and item quantities, table/order type, notes and elapsed time.
- Kitchen can mark tickets as Preparing, Ready and Served/Handed Over.
- Kitchen status updates are reflected in the POS/customer status view.
- Kitchen must not receive a paid-online order as accepted solely because a browser says payment succeeded.

### 4.6 Payments — restricted initial scope
- Initial implementation may support cash and cashier-recorded UPI/card outcomes.
- Do not integrate a paid gateway or any API that can incur charges.
- No real-money payment integration is included in the initial build.
- Any future online UPI flow is blocked until the café's acquiring bank confirms a no-cost/no-card-required merchant integration, test environment, server-side verification method and terms.
- One order maps to at most one successful payment record.
- Every payment attempt uses an idempotency key.
- Server alone changes payment state to PAID.
- Never treat a client redirect, screenshot, button click or app-return URL as proof of payment.
- Test/sandbox only until explicit approval for real-money use.

### 4.7 Inventory
- Admin/Manager can maintain ingredients or stock items, units, current quantity and reorder threshold.
- Recipe/consumption mapping is optional and must not be invented. Do not deduct ingredient stock until recipes and quantities are supplied and approved.
- Stock adjustments require a reason and audit record.

### 4.8 Reports
- Daily sales by payment method and order type.
- Order counts and average order value.
- Item/category sales.
- Cancellations, refunds and manual payment reconciliation.
- Inventory movement only where stock data is actually configured.
- Reports are operational summaries, not audited accounting statements.

## 5. Non-functional requirements

- Responsive and usable on common Android phones, tablets and desktop POS screens.
- Server-side validation for all mutations.
- Role-based authorization and secure password hashing.
- Secrets only in environment variables; `.env` is ignored by Git.
- No analytics, telemetry, ad trackers or third-party data sharing.
- Minimize customer data collection and restrict access to customer contact details.
- Use database transactions for order creation, payment state changes and stock movements.
- Maintain audit history for sensitive staff actions.
- Clear error states for network failures and stale menu/table sessions.
- No hardcoded production secrets, URLs, filesystem paths or bank identifiers.

## 6. Out of scope for initial release

- Delivery fleet dispatch or live delivery tracking.
- Customer loyalty points, coupons and marketing automation.
- WhatsApp/SMS notifications (would require an external service and cost review).
- Online reservations unless separately approved.
- Multi-branch/multi-tenant operation.
- Automated ingredient deduction before recipes are supplied.
- Online gateway integration until the bank and free-only constraints are verified.
- Paid hosting, paid domain, paid email or paid printer cloud services.

## 7. Success criteria

- Customer can scan a valid table QR and see the correct table.
- Customer name/mobile validation works.
- Server rejects unavailable menu items and calculates totals.
- One accepted order appears once in POS and once in the kitchen queue.
- Refreshes, multiple tabs and retries do not create duplicate payment success.
- Unauthorized roles cannot access admin functions.
- Staff can complete a dine-in order from creation through served/closed.
- All test data is explicitly labelled MOCK.
- No paid service, external analytics or real-money payment is used without approval.

## 8. Assumptions requiring owner confirmation

- Final number and names of tables.
- Final menu prices where `menu.md` flags conflicts.
- GST/tax configuration and whether displayed prices are tax-inclusive.
- Whether dine-in orders require staff acceptance before kitchen routing.
- Receipt printer model and connection type.
- Operating hours and public contact details.
- Whether customer phone numbers should be retained, and for how long.
