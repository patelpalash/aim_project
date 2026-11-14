# Shared contract v1

**Implemented:** types and pure functions in `src/shared/`. **Planned:** every HTTP endpoint and storage operation described below. These notes freeze the handoff between the three work areas; they are not a claim that a server already exists.

Palash owns this contract. Ishan and Umang should propose a small example before changing it. Do not create parallel `Event`, `Course` and `Activity` models with incompatible fields.

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

These are proposed app alias imports once Palash adds the Next.js shell. The starter's own tests use relative `.ts` imports so they can run directly with Node 24. There is no configured `@/` alias in the starter yet.

## Offer semantics

The authoritative type is [contracts.ts](../src/shared/contracts.ts), and [demo-offers.json](../data/demo-offers.json) is a complete fixture. Important rules:

| Field | Rule |
| --- | --- |
| `id` | Stable ID for one occurrence. Do not regenerate it on every retrieval. |
| `providerId` | Must refer to an enabled configured provider. Server checks this. |
| `externalId` | Provider's course identity. Occurrence identity also includes start time. Preserve a known occurrence ID when the provider reschedules that same occurrence. |
| `title`, `summary` | German and English strings. Render as text, not HTML. Mark team translations as translations when using real sources. |
| `topics` | One or more of `ai`, `coding`, `gaming`. |
| `interests` | One or more of `build-games`, `robots`, `make-art`, `solve-puzzles`, `tell-stories`. These are discovery tags. |
| `audiences` | `children`, `teens`, `families`, `parents`, `school-groups`. Do not assume school-group bookings are individually accessible. |
| `format` | `workshop`, `course`, `event`, `drop-in`. |
| `minAge`, `maxAge` | Published bound or null. A specific age constraint requires both known bounds in this conservative starter. |
| `startsAt`, `endsAt` | ISO timestamps including offset, or null. Use Europe/Berlin for display; retain absolute instants. Date-only source text requires review rather than an invented time. |
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

## Planned endpoints

For this day, use one public catalog read and client-side filtering. This keeps child preferences and free-text searches off the server. Both UI modes call the same pure matching functions. The application still has searchable data without sending those inputs to an external service.

| Method and route | Request | Success response |
| --- | --- | --- |
| `GET /api/offers` | No personal data or search parameters | `{ schemaVersion: 1, mode: "demo", offers: Offer[], generatedAt: string }` |
| `GET /api/providers` | None | `{ schemaVersion: 1, providers: [{ id, name, discoveryUrl }] }` |
| `POST /api/admin/imports/preview` | JSON `{ providerId: string, offers: unknown[] }` | `{ importId: string, preview: ImportPreview, expiresAt: string }` |
| `POST /api/admin/imports/:importId/approve` | JSON `{ approve: true }` | `{ approved: true, publishedCount: number, catalogueVersion: number }` |
| `GET /api/admin/summary` | None | `{ mode: "demo", catalogueVersion: number, sourceStatuses: SourceStatus[], gaps: DemoGap[] }` |
| `POST /api/admin/reset` | JSON `{ resetDemo: true }` | `{ reset: true, catalogueVersion: number }` |

Use `mode: "demo"` while any synthetic records are included. Add a `reviewed` mode only for a catalog containing no synthetic records. Continue displaying per-record provenance even when modes are separated. The public offer route returns only approved, non-cancelled, not-ended records. Call `filterOffers` with an appropriate audience mode when selecting user results. If the API must serve all audience categories, filter publication/time separately so it does not accidentally remove parents or school data before the client can select it.

Source status proposed shape:

```ts
type SourceStatus = {
  providerId: string;
  lastAttemptAt: string | null;
  lastSuccessfulImportAt: string | null;
  lastReviewedAt: string | null;
  status: "demo-only" | "review-needed" | "reviewed" | "error";
  message: string;
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

1. Writable desk routes run only when an explicit local-demo setting is enabled; return 404 otherwise. Bind the demo to loopback. An adult-view switch is not admin authorization. Public hosting must disable these routes until proper access control and storage exist.
2. Accept one JSON format. Cap uploads at 1 MB and 100 records for this prototype. Reject unknown provider IDs, wrong provider assignments, URLs outside the configured exact host allowlist and unsafe fields. The client must not supply an arbitrary URL for the server to fetch.
3. Map to known `Offer` fields, set candidate review state to `pending`, validate and preview against the current catalog. Do not trust an uploaded `approved` state or reviewer timestamp. Return readable per-record failures.
4. Store the preview and validated candidates server-side for a short period, such as 30 minutes. Approval accepts the import ID, not a second client-supplied replacement payload. Record the catalog version used for the preview.
5. Reject approval with 409 if the catalog changed since preview. On approval, set the review timestamp for source records and atomically persist valid accepted records. Invalid rows remain rejected. A small file store is acceptable for a localhost demo; document its limitations.
6. Repeat approval returns its prior result rather than duplicating records. A repeated unchanged import yields no substantive change. A missing record or failed source read must never silently delete a published offer.
7. Show source errors and old review timestamps honestly. No unattended auto-approval. Only describe a live adapter as working after an actual run has been inspected.

`previewImport` already checks basic structure, ID/occurrence collisions and substantive differences. It does not implement steps 1-5 or persist anything. It ignores fetch/review timestamp changes and array order when finding content changes. It does flag source URL/kind changes. There is no automatic fuzzy deduplication.

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

Load the fixture as `Offer[]` behind a temporary catalog loader. Add one fetch wrapper, so changing from fixture to API does not require rewriting each component. Keep filters in React state. Call `recommendOffers` or `filterOffers` with the same state and render `reasonKeys` through a small dictionary. Keep the numerical heuristic score out of the interface.

Test fixture IDs intentionally cover a full event, unknown age/date/price, parent-only data and a school-only offering. Full demo data should not be flattened into eight apparently bookable family events.

## Adding another institution later

Add an enabled provider configuration, decide a permitted input mechanism, map its records to the same contract, and review them. The `providerId` type permits additional IDs without rewriting the client. New thematic categories require an explicit taxonomy/schema change rather than silently injecting arbitrary tags.
