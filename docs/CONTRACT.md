# Shared contract v1

**Implemented:** shared functions, the integrated frontend, public read APIs, local CSV/source review/publication, source refresh, summary and configuration services. See [STATUS.md](STATUS.md) and [Umang's service handoff](handoffs/UMANG_U3_U4.md). The normalized JSON preview endpoint below remains a proposed recovery route; the implemented inputs are CSV upload and stored-source staging. A passing build does not complete all application acceptance.

Palash owns this contract. Ishan and Umang should propose a small example before changing it. Do not create parallel `Event`, `Course` and `Activity` models with incompatible fields.

Consolidated plan revision 3 retains whole-website interaction/live scraping and adds CSV template, inline draft correction and selected valid bulk publication. Follow [REQUIREMENTS.md](REQUIREMENTS.md), [TEAM_TASKS.md](TEAM_TASKS.md), [EXPERIENCE.md](EXPERIENCE.md), [SCRAPING_PLAN.md](SCRAPING_PLAN.md) and [IMPORT_WORKFLOW.md](IMPORT_WORKFLOW.md). Permission is user-confirmed. P2's compatible fields keep public `schemaVersion: 1`; actual shared module types are authoritative for wire names.

## Files and imports

```ts
import type { Offer, SearchFilters } from "@/shared/contracts";
import {
  validateOffer,
  filterOffers,
  recommendOffers,
  buildParentHandoff,
  previewImport
} from "@/shared/catalog";
```

The `@/` alias is implemented and maps to `src/`. Direct Node tests use relative `.ts` imports. Additional P2 imports and concrete examples are documented in `HANDOFF_PALASH.md`.

## Offer semantics

The authoritative type is [contracts.ts](../src/shared/contracts.ts), and [demo-offers.json](../data/demo-offers.json) is a complete fixture. Important rules:

| Field | Rule |
| --- | --- |
| `id` | Stable ID for one occurrence. Do not regenerate it on every retrieval. |
| `providerId` | Must refer to an enabled configured provider. Server checks this. |
| `externalId` | Provider's course identity. Prefer a stable source occurrence key when available. Dates can help identify an initial occurrence, but must not become a mutable primary identity: preserve a known occurrence ID when it is rescheduled. |
| `title`, `summary` | Render as text, not HTML. The current German-only prototype may retain German fallback in `en` with translation-pending review notes; this is not an English translation. Before enabling English UI, add explicit per-field translation provenance and actual reviewed English copy. |
| `topics` | Configured IDs; defaults are `ai`, `coding`, `gaming`. Validate against the current taxonomy, not a hardcoded UI list. |
| `interests` | Configured discovery IDs; the five original defaults remain unchanged. |
| `audiences` | `children`, `teens`, `families`, `parents`, `school-groups`. Do not assume school-group bookings are individually accessible. |
| `format` | `workshop`, `course`, `event`, `drop-in`. |
| `minAge`, `maxAge`, `ageEvidence` | Published bounds or null. Explicit range/minimum-only/maximum-only/all-ages/unknown evidence controls suitability; incomplete legacy bounds remain unknown. |
| `startsAt`, `endsAt`, `schedulePrecision`, `startDate`, `endDate` | Keep timed instants or explicit local date-only precision; date-only timestamps remain null. Use Europe/Berlin and the shared schedule helpers. |
| `priceEur` | Actual published price, zero for explicitly free, null for unknown. |
| `venue.access` | `step-free`, `not-step-free`, `unknown`. Do not infer access from the provider name. |
| `availability` | Published `available`, `full`, `cancelled` or `unknown`. Retrieval alone does not establish bookability. |
| `reviewStatus` | `pending` or `approved`. Import candidates never publish themselves. |
| `source.kind` | `demo` for invented examples; `verified` identifies provider-sourced records, whose approval still requires human review. |
| `source.url` | Exact HTTPS provider record URL, null for demo. Provider homepage/discovery link alone does not verify an activity. |
| `source.fetchedAt` | Retrieval timestamp, null for demo. |
| `source.verifiedAt` | Human review timestamp. Required for approved provider-sourced records; null for demo. |

The library validates record structure and simple HTTPS links. **Umang must additionally enforce configured providers and exact allowed hosts, including redirects if fetching is ever added.** It is not an SSRF defense, authorization layer or legal permission check. Return selected known fields only; never pass arbitrary imported fields or raw page HTML through the API.

Child/teen presentation is client state, separate from source audience categories. A parent selecting an activity for a child uses family results; `audience=parent` means activities aimed at adults, not merely the adult visual mode.

## HTTP contract and current services

### P2 shared extensions now available

Palash implemented these compatible boundaries; both consumers should use them:

- **Configurable themes:** `data/taxonomy.json`, `validateTaxonomy`, active-definition helpers and runtime-configurable offer validation. Nontechnical edit/read controls are still teammate work.
- **Schedule precision:** optional `schedulePrecision`, `startDate` and `endDate`, Berlin date filtering/status and explicit DST resolution. Unknown times are never manufactured.
- **Age evidence:** optional `ageEvidence` with range/minimum-only/maximum-only/all-ages/unknown semantics; numeric bounds must agree.
- **Review contracts:** `ReviewSession`, row states, editable unvalidated draft, optional prior offer, structural patch guard and pure selection preconditions in `src/shared/review.ts`. Service authorization/normalization/editing/atomic publication remain Umang's work.
- **Source run evidence:** `SourceStatus`/`CatalogResponse` types in `api-contract.ts`; raw retrieval/field evidence stays server-side. Wire failure is `error`, and source review status is `review-needed`; these differ from row `needs-review`.
- **Client discovery state:** `discovery.ts` and `use-discovery.ts` implement P3; `quiz.ts`/`puzzles.ts` implement P4 behavior. Visitor preferences and puzzle state remain client memory. `catalog-client.ts` loads/validates the three public reads; it does not implement those routes.

P2 tests cover these shared helpers and examples. They do not establish that HTTP routes, configuration UI, source adapters or atomic storage exist.

### Public reads and local maintenance

For this day, use one public catalog read and client-side filtering. This keeps child preferences and free-text searches off the server. Both UI modes call the same pure matching functions. The application still has searchable data without sending those inputs to an external service.

| Method and route | Request | Success response |
| --- | --- | --- |
| `GET /api/offers` | No personal data or search parameters | `{ schemaVersion: 1, mode: "demo" | "reviewed", offers: Offer[], generatedAt: string, catalogueVersion: number }` plus agreed source/cache metadata |
| `GET /api/providers` | None | `{ schemaVersion: 1, providers: [{ id, name, discoveryUrl }] }` |
| `GET /api/taxonomy` | None | Configured topic/interest IDs, labels and mappings, with a configuration version |
| `POST /api/admin/scrape-runs` | `{ providerId: string | "all" }` for configured sources | HTTP 202 `{ runId: string, status: "queued" }` |
| `GET /api/admin/scrape-runs/:runId` | None | Run status and per-provider outcomes/counts/errors; no raw HTML in the normal UI |
| `POST /api/admin/imports/preview` | JSON `{ providerId: string, mode: "source" | "demo", offers: unknown[] }` | The same server-stored `ReviewSession`; the pure `ImportPreview` result may remain an internal summary |
| `GET /api/admin/import-template` | None | UTF-8 CSV attachment with fixed headers and example/instructions |
| `POST /api/admin/uploads` | Multipart CSV, configured `providerId`, `mode: "source" | "demo"` | Server-stored `ReviewSession`, as specified in the import workflow |
| `GET /api/admin/imports/:importId` | None | Current `ReviewSession` with revision, rows, issues and counts |
| `PATCH /api/admin/imports/:importId/rows/:rowId` | `{ revision: number, changes: allowlisted field patch }` | Revalidated session/row and incremented revision; public catalog unchanged |
| `POST /api/admin/imports/:importId/approve` | JSON `{ approve: true, rowIds: string[], revision: number }` | `{ approved: true, publishedCount: number, blockedCount: number, unchangedCount: number, catalogueVersion: number }` |
| `GET /api/admin/summary` | None | `{ mode: "demo", catalogueVersion: number, sourceStatuses: SourceStatus[], gaps: DemoGap[] }` |
| `POST /api/admin/reset` | JSON `{ resetDemo: true }` | `{ reset: true, catalogueVersion: number }` |
| `POST /api/admin/topics` | Validated topic definition | Saved configuration/version, preserving existing IDs |
| `POST /api/admin/providers` | Validated source definition and supported adapter/config | Saved configuration/version; a new website format can remain explicitly unsupported |

Public reads and the local CSV/source review/refresh/summary/configuration routes are implemented. `POST /api/admin/imports/from-source { providerId }` stages a stored source run; `POST /api/admin/imports/preview` remains proposed. `/api/admin/topics` and `/api/admin/providers` also have GET handlers. Topic changes use `{ kind: "topic" | "interest", id, label?, enabled?, topicIds? }`. Scrape execution is bounded and separate from visitor reads, with cached publication and polled status. Source refresh accepts configured provider IDs and exact allowed hosts, never an arbitrary public visitor URL. Newly configured CSV-only providers do not automatically gain a scraper or new scraping permission.

Scraped candidates and CSV rows share one normalization/draft/edit/publication service. CSV is a simple nontechnical bulk-input path; it does not replace the required live adapters. Normalized JSON preview remains internal/recovery tooling. Add a scheduled backend refresh after the live workflow is verified; this plan creates no desktop automation.

Use `mode: "demo"` while any synthetic records are included. Add a `reviewed` mode only for a catalog containing no synthetic records. Continue displaying per-record provenance even when modes are separated. The public offer route returns only approved, non-cancelled, not-ended records. Call `filterOffers` with an appropriate audience mode when selecting user results. If the API must serve all audience categories, filter publication/time separately so it does not accidentally remove parents or school data before the client can select it.

Source status proposed shape:

```ts
type SourceStatus = {
  providerId: string;
  lastAttemptAt: string | null;
  lastSuccessfulImportAt: string | null;
  lastReviewedAt: string | null;
  status: "not-run" | "running" | "demo-only" | "review-needed" | "reviewed" | "empty" | "partial" | "error";
  message: string;
  partialCoverage: boolean;
  extractedCount: number;
  rejectedCount: number;
};
type DemoGap = {
  interest: "build-games" | "robots" | "make-art" | "solve-puzzles" | "tell-stories";
  exampleRequests: number;
  suitableCatalogCount: number;
  synthetic: true;
};
```

Use synthetic aggregates for the one-day gap demonstration. No public demand submission endpoint is required. A session-only interaction may update the demo panel in memory, labeled as a simulated single-session action. Never call sample totals real demand or counts of distinct families.

## Server rules for imports

1. Writable desk routes run only with `INTEREST_ATLAS_LOCAL_DESK=1`; return 404 otherwise. Bind the demo to loopback. Writes also reject nonlocal destinations and cross-site origins. An adult-view switch is not admin authorization. Public hosting must disable these routes until proper access control and storage exist.
2. Accept the fixed-column UTF-8 CSV upload and the existing normalized JSON preview format; no PDF/LLM/email/XLSX or custom header mapping is required. Cap uploads at 1 MB and 100 rows/records. Reject unknown providers, wrong provider assignments, source URLs outside exact allowed hosts and unsafe fields. The client cannot supply an arbitrary URL to fetch.
3. Map to known `Offer` fields, set candidate review state to `pending`, validate and preview against the current catalog. Do not trust an uploaded `approved` state or reviewer timestamp. Return readable per-record failures.
4. Store the preview and validated candidates server-side for a short period, such as 30 minutes. Approval accepts the import ID, not a second client-supplied replacement payload. Record the catalog version used for the preview.
5. Inline edits update only server-stored draft candidates, preserve original evidence, increment session revision and rerun normalization/validation/differences. Reject stale edits/approval with 409 if session or catalog version changed. Approval explicitly identifies row IDs and publishes only selected eligible reviewed rows atomically, setting human review time for source records. Blocked rows remain unpublished; unchanged rows are skipped. A small local file store is sufficient for the localhost demo; document its limitations.
6. Repeat approval returns its prior result rather than duplicating records. A repeated unchanged import yields no substantive change. A missing record or failed source read must never silently delete a published offer.
7. Show source errors and old review timestamps honestly. No unattended auto-approval. Only describe a live adapter as working after an actual run has been inspected.

`previewImport` is a pure helper for structure/identity/difference checks. The actual local service is in `src/server/review/`, using the same shared validators and review-session contract. The local file store is a single-server demo implementation; it is not production multi-process storage. Fetch/review timestamp changes alone are not substantive offer changes. There is no automatic fuzzy deduplication.

The same publication rules apply to scraped updates. Record adapter version, attempted/final source URLs, retrieval status, coverage window and field evidence in server-side run records. Treat a zero extraction as unknown until layout/response checks establish a genuine empty result. Preserve the last good catalog after failure or partial coverage. Keep source fetch time distinct from human review time.

Error envelope for the proposed API:

```json
{
  "error": {
    "code": "INVALID_IMPORT",
    "message": "Some records need correction.",
    "issues": [{ "path": "offers[0].priceEur", "message": "Expected a nonnegative price or null" }]
  }
}
```

Use 400 for malformed input, 404 for unavailable/expired imports or a disabled desk, 409 for a stale preview, 413 for upload limits, and 500 for an unexpected internal failure. Hide stack traces and raw provider documents from user-facing responses.

## How Ishan can start immediately

Use `createDemoCatalogBundle` for explicitly labeled fixture mode and `loadCatalog` for real API reads. `useDiscovery` owns client-memory filters/selection/shortlist/optional-play state. Keep its component mounted across view switches. Render `getRecommendationReasons` rather than numerical heuristic scores. Exact imports/action examples and error behavior are in `HANDOFF_PALASH.md`.

Test fixture IDs intentionally cover a full event, unknown age/date/price, parent-only data and a school-only offering. Full demo data should not be flattened into eight apparently bookable family events.

## Adding another institution later

Add a provider configuration, select a supported adapter/input format, map its records to the common contract and review them. A new website structure may need a new adapter. Provider IDs and taxonomy IDs already permit configured additions; the nontechnical controls and backing service still need implementation. Demonstrate a source/theme maintenance action without rewriting results components, as required by the PDF. Permission for the initial four sources is user-confirmed; a later unrelated institution has its own source context.
