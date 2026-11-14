# Shared contract examples

These are validated **fictional fixtures**, not live endpoints, source data or active imports. The example reference clock is **2026-11-14T10:00:00Z**. The review expiry is intentionally fixed for reproducible tests; create a fresh expiry when using an explicitly labeled interactive mock.

- `catalog-response.json`: public schema version 1; one timed offer and one date-only offer with an explicit minimum age. Demo mode and null provider/registration source URLs are deliberate.
- `review-session.json`: one valid pending demo candidate and one blocked row with editable unvalidated `draft` data. Blocked input is not a valid `Offer`.
- `taxonomy-response.json`: current default configuration, also stored in `data/taxonomy.json`. A server can pass an updated validated taxonomy to the shared functions without editing TypeScript unions.
- `providers-response.json`: public names/discovery links for the four configured institutions. It exposes no raw adapter configuration and does not claim any event was scraped.

Shared runtime contracts are in `src/shared/api-contract.ts`, `src/shared/review.ts`, `src/shared/contracts.ts` and related validators. The Node tests validate these fixtures against the actual implementations. See `docs/HANDOFF_PALASH.md` for imports and decisions.
