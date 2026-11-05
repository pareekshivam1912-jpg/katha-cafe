# Design System & UI Guidelines — Katha Cafe

> This document defines the visual and interaction design for the Katha Cafe website, QR ordering experience, cashier POS, kitchen display, and owner dashboard. It is an implementation specification, not a rendered design or Figma file.

## 1. Product design direction

**Brand character:** warm, literary, welcoming, vegetarian, Indian café culture.

Use the supplied Katha Cafe menu screenshots as the primary visual reference. The menu establishes a distinctive identity built around:
- Deep forest-green panels
- Antique-gold ornamental details
- Warm ivory / parchment backgrounds
- Dark-green editorial typography
- Botanical line illustrations and subtle decorative borders
- The Devanagari “कथा” wordmark and the phrase “Dialogues • Chai • Stories”

Do not replace this identity with a generic restaurant template. The earlier rustic direction should be expressed through material texture, warm imagery, and natural accents while keeping the green-and-gold menu identity dominant.

## 2. Brand tokens

Use these as initial design tokens. Sample the supplied original logo/menu artwork before production to refine exact values.

| Token | Suggested value | Usage |
|---|---|---|
| `brand.forest` | `#063B27` | Primary brand, navigation, major headings |
| `brand.forestDeep` | `#022B1D` | Hover states, dark panels |
| `brand.gold` | `#C6922E` | Highlights, icons, separators, selected states |
| `brand.goldSoft` | `#E2BD70` | Fine borders and ornamental accents |
| `surface.ivory` | `#F7F0E2` | Menu and customer-facing surfaces |
| `surface.paper` | `#FFFDF7` | Cards and form surfaces |
| `surface.white` | `#FFFFFF` | POS work areas |
| `text.primary` | `#20251F` | Body text |
| `text.muted` | `#716F65` | Supporting text |
| `status.success` | `#24734A` | Paid, ready, completed |
| `status.warning` | `#B7791F` | Pending, low stock |
| `status.danger` | `#B83232` | Failed, cancelled, out of stock |
| `border.subtle` | `#E6DDCA` | Dividers and card borders |

**Rules**
- Use forest green as the primary brand color and gold as an accent, not as a large text color on ivory.
- Keep body text high-contrast and readable.
- Use ivory/parchment selectively for customer-facing menu and brand storytelling. POS screens should prioritize clean white/light surfaces for long shifts.
- Do not use color alone to communicate payment or order status; pair it with text and an icon.
- Keep decorative flourishes away from dense operational tables and small controls.

## 3. Typography

- **Display / editorial headings:** an elegant serif such as `Cormorant Garamond`, `Playfair Display`, or a licensed equivalent.
- **Body / interface:** a highly legible sans-serif such as `Inter` or `DM Sans`.
- **Devanagari:** use a font with reliable Hindi glyph coverage, such as `Noto Sans Devanagari`.
- Use the “कथा” wordmark as a logo asset where available; do not recreate it with a random font.
- Keep menu item names and prices in a clear sans-serif for quick scanning.
- Avoid script fonts for prices, buttons, forms, and operational data.

Suggested hierarchy:
- Marketing hero title: 48–64 px desktop; 36–44 px mobile
- Page title: 28–36 px
- Section heading: 22–28 px
- Card heading: 16–20 px
- Body: 14–16 px
- Dense POS metadata: 12–14 px, never below 12 px for essential information

## 4. Shared layout principles

- Mobile-first for the public website and QR ordering.
- Desktop-first, responsive down to tablet for cashier, kitchen, and admin workspaces.
- Use a consistent spacing scale based on 4 px: 4, 8, 12, 16, 24, 32, 48, 64.
- Use a restrained radius system: 8 px for controls, 12–16 px for cards, and larger radii only for promotional sections.
- Use subtle borders and restrained shadows. Avoid excessive glassmorphism, gradients, and animated decoration.
- Provide visible keyboard focus states and accessible labels.
- Make primary actions visually distinct and easy to reach.
- Preserve usable layouts at 360 px mobile width and common 1366 px desktop width.

## 5. Public website

### Header
- Forest-green or ivory header with the Katha wordmark.
- Navigation: Home, Menu, Our Story, Gallery, Contact.
- Primary CTA: **Order Now**.
- Mobile navigation must be compact and keyboard accessible.

### Hero
- Use real café photography supplied by the owner.
- Use a warm, editorial composition with an ivory or deep-green text panel.
- Suggested copy: “Dialogues. Chai. Stories.”
- Primary CTA: “Explore Menu” or “Order Now”.
- Do not invent awards, claims, opening hours, or testimonials.

### Menu preview
- Group items by the categories in `menu.md`.
- Show item name, exact listed price, vegetarian marker, availability, and optional image.
- Use forest-green category headings and fine gold dividers.
- Make menu data dynamic from the database; do not hardcode a second menu in the frontend.
- Display price exactly as configured by the café. Tax treatment and any variants must be explicit.

### Story, gallery, location
- Use supplied photos with consistent crop ratios.
- Keep the story concise and authentic.
- Display the verified address, phone number, map link, and owner-confirmed hours.
- Add social links only after the café confirms the official profiles.

## 6. QR customer ordering

### Customer journey
1. Customer scans the table QR.
2. The page identifies the table from a signed/validated QR token.
3. Customer enters full name and mobile number (required); email remains optional.
4. Customer browses categories and item details.
5. Customer adds quantities, variants, and special instructions.
6. Customer reviews the cart and confirms the order.
7. Customer selects the supported payment method.
8. Customer sees an order confirmation and status timeline.

### Screen requirements
- Mobile-first, fast-loading, minimal steps.
- Persistent cart summary and clear item quantity controls.
- Show table number prominently, but do not allow customers to change it manually.
- Show item availability and disable unavailable items.
- Validate mobile number on the server as well as the client.
- Ask for consent separately before using a phone number for promotional messages.
- Do not require account creation or password setup for a normal table order.

### Visual treatment
- Ivory menu surface, forest-green navigation and primary CTA, gold accents.
- Product cards must prioritize name, price, availability, and add action.
- Keep decorative artwork light so it does not slow ordering or reduce readability.
- Order status must be written as text (e.g. “Accepted”, “Preparing”, “Ready”, “Served”).

## 7. Cashier POS

### Main layout
- Persistent top bar: café name, active shift, cashier, network state, and logout.
- Left/center: searchable category and product grid.
- Right panel: current cart, quantities, item notes, subtotal, tax, discount, and total.
- Clear order-type selection: Dine-in, Takeaway, Delivery (only if enabled).
- Table selection is required for dine-in orders.

### Interaction requirements
- Large touch targets, minimum 44 × 44 px.
- Product search must work by item name.
- Cart updates must be immediate and resilient to accidental double taps.
- Show confirmation before destructive actions such as clearing a cart or cancelling an order.
- Keep payment method and payment status separate.
- Receipt action must be available after a completed sale.
- Provide a clear pending-payment state; never display “Paid” until verified.

### Payment status presentation
- `PENDING`: amber + clock icon + “Awaiting confirmation”
- `PAID`: green + check icon + “Paid”
- `FAILED`: red + alert icon + “Payment failed”
- `REFUND_PENDING` / `REFUNDED`: explicit text and distinct status treatment

## 8. Kitchen Display System (KDS)

- Dark, low-distraction screen suitable for a kitchen environment.
- Orders displayed as high-contrast cards grouped by status or age.
- Each card shows order number, table/order type, elapsed time, item quantities, and special instructions.
- Actions: Accept (if configured), Start Preparing, Mark Ready, Mark Served.
- Use both color and text for status.
- Highlight overdue tickets without relying on flashing animations.
- Keep cancelled orders visually distinct and out of the active queue.
- Realtime updates must come from the server; refresh/reconnect state must be visible.

## 9. Owner / admin dashboard

- Light operational workspace with forest-green navigation.
- Summary cards: gross sales, net sales, order count, average order value, payment split, and low-stock count.
- Date range and shift filters must be visible.
- Charts should use restrained brand colors and readable labels.
- Every metric must define its calculation and timezone.
- Avoid showing sample/demo numbers as live café data.
- Provide loading, empty, error, and permission-denied states.

## 10. Inventory management

- Table-first interface for ingredients and stock movements.
- Columns: ingredient, unit, current stock, reorder threshold, status, last updated.
- Use amber for low stock and red for out of stock.
- Record stock adjustments with reason, user, timestamp, and quantity.
- Recipe-based deductions must be configurable and should not silently assume ingredient quantities.
- Make manual corrections auditable.

## 11. Reports and analytics

- Provide filters for date range, shift, order type, payment method, and status.
- Separate gross sales, discounts, taxes, refunds, and net collected amounts.
- Include export actions only for authorized roles.
- Use clear units (₹, item count, minutes).
- Do not treat pending payments as collected revenue.
- Reconcile online payment records with verified bank/acquirer transaction references.

## 12. Navigation and role-specific access

| Role | Primary navigation |
|---|---|
| Owner / Admin | Overview, Orders, Menu, Inventory, Staff, Payments, Reports, Settings |
| Manager | Orders, Menu availability, Inventory, Shifts, Reports (permitted scope) |
| Cashier | POS, Active Orders, Tables, Receipts, Shift Summary |
| Kitchen Staff | Kitchen Queue, Ready Orders |
| Customer | Menu, Cart, Order Status |

Enforce permissions on the backend. Hiding a navigation item is not an authorization control.

## 13. Components to build

- `BrandHeader`
- `PrimaryButton`, `SecondaryButton`, `IconButton`
- `CategoryTabs`
- `MenuItemCard`
- `PriceLabel`
- `QuantityStepper`
- `CartPanel`
- `OrderTypeSelector`
- `TableBadge`
- `OrderStatusBadge`
- `PaymentStatusBadge`
- `OrderTicket`
- `DataTable`
- `MetricCard`
- `EmptyState`
- `ErrorState`
- `ConfirmDialog`
- `Toast`
- `FormField`
- `LoadingSkeleton`

Build shared components with consistent states: default, hover, focus, disabled, loading, and error where applicable.

## 14. Accessibility and usability

- Target WCAG 2.2 AA where practical.
- Maintain sufficient text/background contrast.
- Support keyboard navigation for all operational controls.
- Use semantic headings, buttons, labels, and table markup.
- Associate validation errors with their form fields.
- Do not use color as the only status indicator.
- Respect reduced-motion preferences.
- Ensure touch targets are large enough for tablets and phones.
- Test Hindi/English text and Devanagari rendering.

## 15. Responsive behavior

| Viewport | Expected behavior |
|---|---|
| Mobile (360–767 px) | Single-column website and ordering; sticky cart/checkout action |
| Tablet (768–1023 px) | Two-column menu where suitable; tablet-friendly POS |
| Desktop (1024 px+) | Full POS workspace, dashboard grids, multi-column admin views |
| Kitchen display | Responsive ticket grid; optimized for the actual display resolution |

Do not simply shrink the desktop POS onto a phone. Provide a focused mobile workflow if mobile POS access is enabled.

## 16. Content and data integrity rules

- `menu.md` is the source reference for transcribed menu items and prices until the café owner confirms the final live menu.
- Conflicting prices must be flagged for owner confirmation; do not silently choose one.
- Menu items, prices, availability, categories, tax configuration, and modifiers must be database-driven.
- Never invent food images, ingredients, allergen claims, preparation times, or dietary labels.
- The café is vegetarian-only based on the supplied business information; still confirm item-level ingredients and dietary claims with the owner.
- Use Indian currency formatting (₹) and `Asia/Kolkata` for café-local timestamps.
- Demo data must be visibly labelled as demo data.

## 17. Design QA checklist

- [ ] Brand colors and typography match the supplied menu identity.
- [ ] Logo/wordmark assets are owner-approved.
- [ ] Public website is usable on mobile and desktop.
- [ ] QR ordering works at 360 px width.
- [ ] Table identity is visible and cannot be edited by the customer.
- [ ] Prices match the owner-approved `menu.md` and database records.
- [ ] Cart totals and tax calculations are transparent.
- [ ] Payment is not marked paid without trusted verification.
- [ ] POS supports keyboard and touch interaction.
- [ ] KDS status changes are realtime and recover after reconnect.
- [ ] Admin metrics exclude pending/unverified payments from collected revenue.
- [ ] Role permissions are tested on the server.
- [ ] Empty, loading, offline, and error states are implemented.
- [ ] Contrast, focus, and screen-reader labels are checked.

## 18. Implementation note

Implement this design system incrementally:
1. Add tokens, fonts, base layout, and shared components.
2. Build public website and customer QR ordering.
3. Build cashier POS and order ticket components.
4. Build KDS and realtime status presentation.
5. Build admin, inventory, and reports.
6. Run responsive, accessibility, and workflow QA.

The design specification does not authorize changing business rules, payment verification, menu prices, or role permissions defined in the other project documents.
