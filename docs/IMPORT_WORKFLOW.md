# Shared import and review workflow

Consolidated plan revision 3. This is a specification for Umang's server and Ishan's organizer UI, not an implemented service. Follow [CONTRACT.md](CONTRACT.md) and reuse the shared offer model/validator/change-preview logic, with Palash's coordinated extensions.

## Two inputs, one publication path

The first-day inputs are **four provider-specific live adapters** and **one UTF-8 CSV template**. Both use the same normalization, stable identity, validation, staged row, review and publication code. The current normalized JSON preview remains useful internally and for recovery. Do not build separate event stores or approval systems for CSV and scraping.

No PDF/LLM parser, email inbox, arbitrary link fetcher, XLSX parser or remembered column-mapping system is required on the first day. Choose one explicit CSV format and explain it next to the template download. No inferred ages, costs, dates or availability are allowed.

## CSV template

Umang will create the actual download and sample file during implementation. Proposed columns:

```text
externalId,title,description,topics,audience,ageText,date,startTime,endTime,venue,priceEur,format,sourceUrl
```

- The organizer selects the provider once per upload; the server validates every row against it.
- Use `YYYY-MM-DD` dates and optional `HH:mm` time fields in Europe/Berlin. Blank time means date-only, never an invented hour.
- Separate multiple topic/audience IDs with semicolons inside a CSV cell. Use standard CSV quoting for commas, quotes and newlines.
- Preserve the source's age wording in `ageText`. Recognized explicit bounds may be parsed with evidence; uncertainty needs review. "ab 10 Jahren" supplies a minimum only.
- A blank cost is unknown; zero means explicitly free. An unknown field may remain unknown after review, but it cannot satisfy a filter claiming a known bound/cost.
- `externalId` and exact source URL supply identity/evidence for real records. Keep provider facts separate from staff-edited simplified copy.
- Real-source uploads require source evidence and pending review. A separate explicit demo mode marks invented rows as demo and prevents registration links. Do not publish invented rows as institution facts.

Column IDs are fixed for the first day. Display friendly German labels in the UI. Map CSV text to the existing localized fields using an agreed source-language fallback; do not claim an untranslated German title is an English translation. Palash coordinates any shared schema changes first.

## Maintainer journey

1. Open the local organizer workspace and select a provider.
2. Download the template or run a source refresh. CSV upload validates encoding, size, columns and row limits before staging.
3. Inspect a preview with source/provider context, counts and stable row IDs.
4. Open a row's source facts/diff, correct allowed fields inline, and revalidate without changing public events.
5. Select eligible rows, confirm review and publish those rows only. Rejected or blocked rows stay out of discovery.
6. See publication counts and the new catalog version. Repeating the import does not create copies.

## Row states

| State | Meaning and action |
| --- | --- |
| `ready-new` | Valid new candidate; organizer may select after reviewing facts |
| `ready-update` | Valid change to a stable existing identity; show before/after fields |
| `needs-review` | Uncertain/nonblocking information needs explicit review or correction; keep uncertainty visible |
| `blocked` | Missing/invalid required identity, title, schedule for upcoming publication, wrong provider/host or another hard failure; cannot publish |
| `unchanged` | Existing record with no substantive changes; skip publication |

Duplicate identities within an upload are conflicts to resolve, not two publishable rows. Recalculate state after editing. The UI uses text/icons as well as color. A green row still requires the organizer's explicit publication choice.

Keep original source evidence and any staff edits separately. Server-side sessions have an ID, revision, catalog version, expiry and row states. Editing increments session revision and recalculates validation/differences. Approval identifies row IDs and the expected revision; a stale session/catalog is rejected with 409. Never trust a client to change a blocked state into ready.

## API handoff

All routes are proposed and local-maintenance-only:

| Route | Purpose |
| --- | --- |
| `GET /api/admin/import-template` | CSV attachment with fixed headers and a clearly marked demo example row; instructions remain in the UI |
| `POST /api/admin/uploads` | Multipart CSV plus configured `providerId` and `mode: source|demo`; returns a review session |
| `GET /api/admin/imports/:importId` | Current session, row states, issues/diffs and revision |
| `PATCH /api/admin/imports/:importId/rows/:rowId` | Allowlisted field edits and expected session revision; returns revalidated session/row |
| `POST /api/admin/imports/:importId/approve` | Explicit selected row IDs, expected revision and review confirmation; publishes eligible rows only |

Use the error envelope and storage/host limits in `CONTRACT.md`. Keep upload size at 1 MB and at most 100 rows for the prototype. Do not expose arbitrary filesystem paths, HTML or unconfigured fetch targets. All published data comes from one catalog store.

Proposed shared response shape, to be implemented once through Palash's contract work:

```ts
type ReviewRowState = "ready-new" | "ready-update" | "needs-review" | "blocked" | "unchanged";
type ReviewSession = {
  importId: string;
  revision: number;
  catalogueVersion: number;
  providerId: string;
  mode: "source" | "demo";
  expiresAt: string;
  rows: {
    rowId: string;
    state: ReviewRowState;
    candidate: Offer | null;
    issues: Issue[];
    changedFields: string[];
  }[];
  counts: Record<ReviewRowState, number>;
};
```

`Offer` remains the one existing catalog model with agreed extensions; `Issue` reuses the shared path/message shape. Store richer source evidence internally, exposing a safe reviewer summary. A correction request contains the expected `revision` and allowlisted changes. Publication contains `{ approve: true, rowIds, revision }`. No client-side row state bypasses server validation or explicit review of uncertainty.

For `needs-review`, the organizer must explicitly review/confirm any unresolved uncertainty before selection/publication; unknown optional facts can remain visibly unknown. A hard validation failure is always `blocked`. Never fabricate a value merely to make a row appear ready. The final review confirmation applies to the selected rows and their visible warnings, not every row in the upload.

## Demonstration and tests

Umang creates a clearly fictional 20-row demonstration CSV with stable IDs and dates suitable for the rehearsal clock: 18 valid rows and two blocked rows. Correct one blocked row inline; publish the 19 reviewed eligible rows; show that the unresolved row remains unpublished. Re-import the same file and demonstrate no duplicates. These are demonstration counts, not measured time savings.

Also verify a real scraped record through the same review service, an existing record update, a changed title/reschedule preserving identity, invalid input, stale edits/approval, source failure and a repeatable reset. Use original source evidence to spot-check age/date/cost. Do not rely on synthetic upload tests alone to claim the live adapters work.

## One compact organizer workspace

Ishan builds one route with Review/Upload and Sources/Themes sections. Review offers refresh/status, upload/template, row correction and selected publication. Sources/Themes shows enabled provider configuration, last successful run, errors and simple source/theme maintenance controls. Optional demo insights can be added after this loop and the public journey work.

Adding a source using a supported format/adapter can be configuration-driven. A new website structure may need development. A fifth-source demonstration can use an explicitly labeled local fixture/supported format; do not silently enable scraping of an unrelated host outside the agreed initial scope.
