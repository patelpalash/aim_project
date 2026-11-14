# Palash bootstrap and shared-contract handoff

P1 is published on `main` at commit `245e1b1`. This document accompanies P2's additive contracts. The product scope stays plan revision 3; new shared helpers are not proof that Ishan's UI or Umang's service exists.

## Update the local clone

With local work saved, incorporate `origin/main` into your role branch using `CONTRIBUTING.md`, then run `npm ci` because root dependencies changed. Use Node.js 24+. `npm run dev` starts the loopback shell; `npm run check` checks all included TypeScript and shared tests; `npm run build` creates production; `npm run start` serves it.

The `@/` alias maps to `src/`. Node's direct TypeScript tests still use relative `.ts` imports. Keep one Next.js application; Ishan replaces the minimal bootstrap page/layout with the visual implementation.

## Imports for both teammates

```ts
import type { Offer, SearchFilters, Taxonomy } from "@/shared/contracts";
import { validateOffer, filterOffers, recommendOffers, previewImport, buildParentHandoff } from "@/shared/catalog";
import { DEFAULT_TAXONOMY, validateTaxonomy, getActiveTopics, getActiveInterests } from "@/shared/taxonomy";
import { getAgeSuitability } from "@/shared/age";
import { getScheduleStatus, getBerlinDate, resolveBerlinLocalDateTime } from "@/shared/schedule";
import type { CatalogResponse, SourceStatus } from "@/shared/api-contract";
import { validateCatalogResponse } from "@/shared/api-contract";
import type { ReviewSession, ReviewRow, ReviewPatchRequest, ReviewApprovalRequest } from "@/shared/review";
import { validateReviewSession, validateReviewPatch, validateReviewSelection, countReviewRows } from "@/shared/review";
```

## Contract decisions

1. **Compatibility:** `Offer` keeps all original required fields. The eight original fixtures remain unchanged. The public `schemaVersion` remains 1 because the added schedule/age fields are optional. `Topic`/`Interest` IDs are strings validated against configuration, not closed unions.
2. **Taxonomy:** `data/taxonomy.json` is the initial configuration. Validate changes with `validateTaxonomy`. Pass the server's current taxonomy to `validateOffer`, `previewImport` and response validators; the static default is a fallback, not a mutable runtime registry. Disabled definitions can still identify historical records; active discovery controls use `getActiveTopics`/`getActiveInterests`.
3. **Age:** optional `ageEvidence.kind` is `range`, `minimum-only`, `maximum-only`, `all-ages` or `unknown`, with optional original wording in `text`. Numeric bounds must agree. A legacy offer is a known range only when both numeric bounds exist; an incomplete legacy bound remains unknown. Never manufacture an upper bound for a published minimum.
4. **Schedule:** legacy timestamps still work. A date-only offer has `schedulePrecision: "date-only"`, `startDate: "YYYY-MM-DD"`, optional/null `endDate`, and null `startsAt`/`endsAt`. Unknown times stay unknown. `getScheduleStatus` separates upcoming, ongoing, today-without-time, past and undated. Local date filters include the whole Berlin day; precise timestamp filters cannot be satisfied by a date-only record.
5. **DST:** `resolveBerlinLocalDateTime` returns a unique UTC timestamp, explicit ambiguous candidates, or an invalid-time outcome. A spring gap is not silently shifted and an autumn repeated hour is not guessed.
6. **Review:** the row-state/session shape from `IMPORT_WORKFLOW.md` is implemented in `review.ts`. `candidate` is a valid `Offer` or null; new/changed candidates remain pending. A blocked row can expose `draft: Record<string, unknown>` for correction, never masquerading as a valid offer. Optional `before` supplies a valid prior record for a diff.
7. **Review guards:** `validateReviewPatch` checks the allowlisted patch structure, not full candidate validity. Re-normalize/revalidate after applying it. `validateReviewSelection` checks explicit confirmation, selected IDs, blocked/unchanged state, session/catalog revision and expiry; it returns copies and does not publish, authenticate or persist. The server must supply actual current versions/time and enforce source hosts/atomic storage itself.
8. **Source status:** the API wire union follows `api-contract.ts`: `not-run`, `running`, `demo-only`, `review-needed`, `reviewed`, `empty`, `partial`, `error`. The review row state is separately named `needs-review`. UI labels may say "failed" for an `error`; do not create another incompatible wire enum.
9. **Handoff link:** `buildParentHandoff` adds schedule/age information and `providerDetailsUrl`; `registrationUrl` remains as a compatibility alias. Both are null for demo/unreviewed data. They point to provider details, not an in-app booking action.

## Concrete fixtures

Use `examples/catalog-response.json`, `examples/review-session.json` and `examples/taxonomy-response.json` to develop the client/service against identical payloads. They validate against the shared modules and use a fixed test clock; they are not HTTP routes or active review jobs. Both original demo datasets remain in `data/`.

## Boundaries still owned by teammates

Ishan owns rendering, motion, client interaction controls and the organizer screens. Umang owns `/api` routes, source/CSV normalization, source evidence, draft editing, review publication, authorization, caching and storage. P2 creates no live adapters, admin routes, uploaded CSV parser or hosted deployment. P5 must test their actual implementation when available; pure guards alone do not establish atomic publication.
