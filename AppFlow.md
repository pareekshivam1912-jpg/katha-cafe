# Application Flows — Katha Cafe

## 1. Public website flow

1. Visitor opens Katha Cafe website.
2. Landing page presents café identity, vegetarian positioning and key actions.
3. Visitor opens Menu, About, Gallery, Location or Contact.
4. Menu is loaded from the backend; unavailable items are visibly marked unavailable.
5. Visitor can open directions or call the café using confirmed details.

## 2. QR table ordering flow

1. Guest scans the QR code fixed to a table.
2. Web app resolves the opaque QR token to an active table.
3. Page displays the detected table number as read-only.
4. Guest enters full name and 10-digit mobile number.
5. Server validates the table token and customer details.
6. Guest browses menu categories and item details.
7. Guest adds items, adjusts quantities and optional notes.
8. Cart shows server-validated prices and estimated total.
9. Guest submits order once.
10. Server revalidates availability and prices, creates the order and order items in one database transaction.
11. Guest sees order reference and Submitted status.
12. Staff reviews the incoming QR order and accepts or rejects it.
13. Accepted order appears on the kitchen display.
14. Kitchen updates Preparing → Ready.
15. Staff serves the order; customer status page reflects updates.
16. Cashier records/validates payment according to the café's chosen counter process.
17. Cashier closes the order/table session when appropriate.

### QR flow failure cases
- Invalid/disabled table token: show “This table QR is unavailable. Please ask staff.”
- Menu item unavailable at submission: reject the stale cart and identify the item.
- Network failure before submit: allow retry using the same submission idempotency key.
- Network failure after submit: retrieve the existing order by idempotency key; do not create another order.
- Table session closed: prevent new order submission and direct customer to staff.
- Customer status token invalid: do not reveal order or customer data.

## 3. POS cashier flow

1. Cashier signs in.
2. Cashier selects Dine-in, Takeaway or Counter.
3. For dine-in, cashier selects an active table.
4. Cashier adds menu items and quantities.
5. Server calculates subtotal, discounts (if configured), tax and total.
6. Cashier reviews the order and confirms.
7. Order is stored and routed to kitchen according to configured acceptance policy.
8. Cashier records cash or verifies counter UPI/card using the actual payment evidence available to the café.
9. Receipt is printed or displayed.
10. Cashier closes the order when service is complete.

## 4. Kitchen flow

1. Kitchen staff signs in to KDS.
2. KDS displays accepted orders in chronological order.
3. Kitchen opens a ticket to view item quantities, table and notes.
4. Kitchen marks Preparing.
5. Kitchen marks Ready.
6. Service staff marks Served/Handed Over.
7. Status changes are persisted and broadcast to authorized clients.

## 5. Owner/admin flow

1. Admin signs in.
2. Admin manages categories and menu items.
3. Admin changes item price/availability; each price change is audited.
4. Admin manages table records and generates table QR codes.
5. Admin creates staff accounts and assigns roles.
6. Admin configures inventory records and approved recipe mappings.
7. Admin views sales, order and reconciliation reports.
8. Admin exports local report data if required.

## 6. Payment and duplicate protection

- One order can have at most one successful payment.
- First click creates a payment attempt with an idempotency key; the UI disables the Pay/Confirm control while the request is in flight.
- Retries reuse the same key.
- Two tabs use the same order-level payment guard; database uniqueness is the final authority.
- On refresh/back, client fetches server payment status rather than creating a new successful payment.
- Slow or ambiguous payment verification remains PENDING/NEEDS_REVIEW; never assume failure or success.
- The initial version records cashier-verified counter payments only. No payment gateway is assumed.

## 7. Role access summary

| Feature | Customer | Kitchen | Cashier | Manager | Admin |
|---|---:|---:|---:|---:|---:|
| View public menu | Yes | Yes | Yes | Yes | Yes |
| Submit QR order | Yes | No | No | No | No |
| View own order status | Yes | No | No | No | No |
| View kitchen queue | No | Yes | Limited | Yes | Yes |
| Create POS order | No | No | Yes | Yes | Yes |
| Record payment | No | No | Yes | Yes | Yes |
| Manage menu | No | No | No | Yes | Yes |
| Manage staff/settings | No | No | No | Limited | Yes |
| View reports | No | No | Limited | Yes | Yes |
