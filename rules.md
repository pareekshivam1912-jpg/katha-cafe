# Project Rules — Read Before Every Task

These rules are mandatory. If a rule conflicts with a request, stop and ask the owner.

## 1. Free only
- Never use paid software, paid APIs or paid tiers.
- Never use anything that can charge: card-required trials, auto-renewing plans or pay-per-use APIs.
- A free tier requiring a credit card counts as paid.
- Prefer free, open-source, maintained tools with MIT/Apache or similarly permissive licenses.
- Before using any tool/service, state its free limits, license and whether a card is required.

## 2. When no free alternative exists
- Stop. Do not install or integrate it.
- Present 2–3 options: local/offline replacement, a simple in-house implementation, mock/stub or reduced scope.
- Explain cost, safety, effort and limitations.
- Wait for approval.

## 3. Phases run in strict order
- Never skip, combine or partially execute phases.
- Phase N must be complete and verified before Phase N+1.
- At each phase end, summarize changes, show tests and wait for “go ahead”.
- If blocked, report the blocker; do not jump ahead.
- If a later phase requires an earlier-phase change, report it and wait for approval.

## 4. Verification
- Never call a phase done without running it.
- Show the exact command and actual output.
- Be honest about broken, untested or mocked behavior.
- Label all mock data clearly as MOCK.

## 5. Scope control
- Do not add unrequested features, dependencies or refactors.
- Every dependency requires a one-line reason, license and pinned version.
- Do not change files outside the current phase.
- Do not overwrite user work without approval.

## 6. Payments
- One order = at most one successful payment.
- Every payment request requires an idempotency key.
- Disable Pay/Confirm after the first click while the request is in flight.
- Use a unique constraint and order/payment state to prevent multiple successful payments.
- Server decides payment state; frontend never marks an order paid.
- Confirm online payments only through an authenticated, trusted provider/bank server-side confirmation.
- Handle refresh, back button, slow-network retries, double clicks and two tabs.
- Sandbox/test mode only. No real-money integration without explicit approval.
- Test double clicks and retries before marking the phase complete.
- If a free trusted verification route does not exist, stop and present alternatives.

## 7. Safety and privacy
- No secrets or keys in source code.
- Use `.env`, keep it in `.gitignore`, and commit placeholders only in `.env.example`.
- Install only well-known, maintained packages; flag suspicious packages.
- Ask before deleting files or running destructive commands.
- Prefer local/offline tools; do not send café/customer data to third parties without approval.
- No analytics, telemetry, ad trackers or session replay.
- Minimize customer PII and restrict staff access.

## 8. Progress tracking
- Keep `PROGRESS.md` with every phase marked `todo`, `in progress` or `done`.
- Keep `DECISIONS.md` with reasons for each tool/approach.
- Update `README.md` after every phase.
- Do not mark implementation phases done based only on documentation.

## 9. Git
- One commit per phase with a clear message.
- Commit a verified working state before starting the next phase.
- Never force-push or rewrite history without approval.
- Do not commit secrets, customer data, database dumps or generated credentials.

## 10. When stuck
- After 2–3 failed attempts, stop and explain the problem.
- Do not loop or apply unapproved workarounds.
- Ask when requirements are unclear.

## 11. Code quality
- Keep code simple and readable.
- Comment only where logic is not obvious.
- Handle errors properly.
- Do not hardcode production paths, URLs, credentials, bank identifiers or configurable values.

## Phase checklist
- [x] Phase 0: Documentation baseline
- [ ] Phase 1: Repository and local development foundation
- [ ] Phase 2: Database and authentication
- [ ] Phase 3: Menu and public website
- [ ] Phase 4: Tables, QR codes and customer details
- [ ] Phase 5: QR ordering and order lifecycle
- [ ] Phase 6: POS and kitchen display
- [ ] Phase 7: Cashier payment recording and reconciliation
- [ ] Phase 8: Inventory and reports
- [ ] Phase 9: Hardening, backup and release readiness
