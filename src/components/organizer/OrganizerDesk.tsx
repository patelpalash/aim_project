"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Locale, Offer, Taxonomy } from "@/shared/contracts";
import type { ProviderSummary, SourceStatus } from "@/shared/api-contract";
import { countReviewRows, validateReviewSession, type ReviewFieldPatch, type ReviewRow, type ReviewSession } from "@/shared/review";
import { pick } from "@/shared/i18n";
import { availabilityLabel, formatPrice, formatStamp } from "../atlas/format";
import { LanguageSwitch, useLocale, type Translate } from "../i18n";
import { BrandLogo } from "../BrandLogo";
import {
  AdminApiError, ServiceMissingError, approveRows, fetchAdminProviders, fetchAdminSummary, fetchProviders, fetchSession, fetchTaxonomy,
  fetchSourceStatuses, fetchScrapeRun, importFromSource, patchRow, saveProvider, saveTopic, startScrapeRun, uploadCsv,
  type AdminProviderView, type ApproveResult, type ProviderChange, type ScrapeRun, type TopicChange
} from "./api";
import "./organizer.css";

const STATES: readonly ReviewRow["state"][] = ["ready-new", "ready-update", "needs-review", "blocked", "unchanged"];
const STATE_TONE: Record<ReviewRow["state"], string> = { "ready-new": "ok", "ready-update": "ok", "needs-review": "warn", blocked: "bad", unchanged: "muted" };
const AVAILABILITIES = ["available", "full", "cancelled", "unknown"] as const;
const LAST_IMPORT_KEY = "atlas.organizer.importId";
const selectableRow = (row: ReviewRow) => row.candidate !== null && row.state !== "blocked" && row.state !== "unchanged" && row.issues.length === 0;

/**
 * I5: the organizer desk — CSV template/upload, readable row states, inline correction via the
 * server, selection and "Publish selected valid rows". A calm neutral tool in the clean-studio
 * system. While Umang's /api/admin routes return 404, the desk says so and can only show the
 * contract example session read-only; nothing is ever faked as published.
 */
export function OrganizerDesk({ enabled }: { enabled: boolean }) {
  const { locale, t } = useLocale();
  const say = (de: string, en: string) => locale === "de" ? de : en;
  const translatorRef = useRef(t);
  translatorRef.current = t;
  const [tab, setTab] = useState<"review" | "sources">("review");
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [publicApiMissing, setPublicApiMissing] = useState(false);
  const [adminMissing, setAdminMissing] = useState(!enabled);
  const [summary, setSummary] = useState<{ catalogueVersion: number; publishedRealCount: number } | null>(null);
  const [reviewToken, setReviewToken] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [localOnly, setLocalOnly] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [mode, setMode] = useState<"demo" | "source">("demo");
  const [selected, setSelected] = useState<string[]>([]);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [approveResult, setApproveResult] = useState<ApproveResult | null>(null);
  const [statuses, setStatuses] = useState<SourceStatus[]>([]);
  const [scrape, setScrape] = useState<ScrapeRun | null>(null);
  const [watchRunId, setWatchRunId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const approvalToken = session && selected.length ? `${session.importId}:${session.revision}:${[...selected].sort().join(",")}` : "";
  const reviewConfirmed = !!approvalToken && reviewToken === approvalToken;
  const checkConnection = useCallback(() => {
    fetchAdminSummary().then(next => { setSummary(next); setAdminMissing(false); }).catch(err => { setAdminMissing(true); if (!(err instanceof ServiceMissingError)) setError(translatorRef.current("org.checkConnection")); });
  }, []);
  useEffect(() => { if (enabled) checkConnection(); }, [enabled, checkConnection]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, t] = await Promise.all([fetchProviders(), fetchTaxonomy()]);
        if (!alive) return;
        setProviders(p); setTaxonomy(t); setProviderId(prev => prev || p[0]?.id || "");
        const nextStatuses = await fetchSourceStatuses(t);
        if (alive) setStatuses(nextStatuses);
      } catch {
        if (alive) { setPublicApiMissing(true); setError(t("org.configFailed")); }
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!watchRunId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = Date.now() + 120_000;
    const poll = async () => {
      try {
        const next = await fetchScrapeRun(watchRunId);
        if (!alive) return;
        setScrape(next);
        if (next.status === "done") {
          setNotice(t("org.runFinished"));
          const nextStatuses = await fetchSourceStatuses(taxonomy ?? undefined);
          if (alive) { setStatuses(nextStatuses); setWatchRunId(null); }
        } else if (Date.now() >= deadline) {
          setWatchRunId(null);
          setNotice(t("org.runOngoing"));
        } else timer = setTimeout(poll, 1000);
      } catch (err) {
        if (alive) { setWatchRunId(null); setError(err instanceof Error ? err.message : t("org.runStatusFailed")); }
      }
    };
    void poll();
    return () => { alive = false; clearTimeout(timer); };
  }, [watchRunId, taxonomy, t]);

  const adoptSession = useCallback((next: ReviewSession, local: boolean) => {
    setReviewToken(null);
    setSession(next); setLocalOnly(local); setApproveResult(null); setOpenRow(null);
    setSelected(prev => next.rows.filter(r => prev.includes(r.rowId) && selectableRow(r)).map(r => r.rowId));
    // Remember the import for this tab only, so a reload resumes the same review.
    try { if (local) sessionStorage.removeItem(LAST_IMPORT_KEY); else sessionStorage.setItem(LAST_IMPORT_KEY, next.importId); } catch { /* private mode */ }
  }, []);

  // Resume the review after a reload. A missing or expired import is simply dropped.
  useEffect(() => {
    if (!taxonomy) return;
    let alive = true;
    let importId: string | null = null;
    try { importId = sessionStorage.getItem(LAST_IMPORT_KEY); } catch { importId = null; }
    if (!importId) return;
    fetchSession(importId, taxonomy ?? undefined)
      .then(next => { if (alive) { adoptSession(next, false); setNotice(translatorRef.current("org.resumed", { id: next.importId })); } })
      .catch(() => { try { sessionStorage.removeItem(LAST_IMPORT_KEY); } catch { /* ignore */ } });
    return () => { alive = false; };
    // Runs once the taxonomy is known so the session validates against the configured one.
  }, [taxonomy, adoptSession]);

  const run = async (label: string, work: () => Promise<void>) => {
    setBusy(label); setError(null); setNotice(null);
    try { await work(); }
    catch (err) {
      if (err instanceof ServiceMissingError) { setAdminMissing(true); setError(null); }
      else setError(err instanceof AdminApiError && err.status === 409 ? say("Die Prüfung wurde inzwischen geändert. Laden Sie die aktuelle Prüfung neu und wählen Sie die Zeilen erneut.", "This review has changed. Reload the current review and select the rows again.") : err instanceof AdminApiError ? err.message : t("org.unexpected"));
    }
    finally { setBusy(null); }
  };

  const onUpload = (file: File) => run("upload", async () => {
    const next = await uploadCsv(file, providerId, mode, taxonomy ?? undefined);
    adoptSession(next, false);
    setNotice(t("org.loaded", { id: next.importId, n: next.rows.length }));
  });

  const onReload = () => session && run("reload", async () => adoptSession(await fetchSession(session.importId, taxonomy ?? undefined), false));

  const onPatch = (row: ReviewRow, changes: ReviewFieldPatch) => session && run(`patch:${row.rowId}`, async () => {
    const next = await patchRow(session.importId, row.rowId, session.revision, changes, taxonomy ?? undefined);
    adoptSession(next, false);
    setNotice(t("org.rowSaved"));
  });

  const onApprove = () => session && run("approve", async () => {
    if (!reviewConfirmed) return;
    const result = await approveRows(session.importId, selected, session.revision);
    setNotice(null);
    // Refresh first: adoptSession clears the previous result, so the new one is set afterwards.
    const next = await fetchSession(session.importId, taxonomy ?? undefined).catch(() => null);
    if (next) adoptSession(next, false);
    setApproveResult(result);
    checkConnection();
  });

  const loadExample = () => run("example", async () => {
    const raw = await import("../../../examples/review-session.json");
    const valid = validateReviewSession(raw.default ?? raw, taxonomy ?? undefined);
    if (!valid.ok) throw new AdminApiError(t("org.exampleInvalid"));
    adoptSession(valid.session, true);
    setNotice(t("org.exampleLoaded"));
  });

  const counts = useMemo(() => (session ? countReviewRows(session.rows) : null), [session]);
  const readyIds = session?.rows.filter(selectableRow).map(r => r.rowId) ?? [];

  return (
    <div className="org">
      <a className="skip-link" href="#org-main">{t("org.skip")}</a>
      <header className="org__top">
        <div className="wrap org__top-in">
          <BrandLogo />
          <span className="tag">{t("org.badge")}</span>
          <div className="dz-view" role="group" aria-label={t("org.areaLabel")}>
            <button type="button" aria-pressed={tab === "review"} onClick={() => setTab("review")}>{t("org.tabReview")}</button>
            <button type="button" aria-pressed={tab === "sources"} onClick={() => setTab("sources")}>{t("org.tabSources")}</button>
          </div>
          <LanguageSwitch />
        </div>
      </header>

      <main className="wrap org__main" id="org-main" tabIndex={-1}>
        <section className="org-welcome"><div><p>{say("INTEREST ATLAS · VERWALTUNG", "INTEREST ATLAS · ADMIN")}</p><h1>{say("Aus Quellen werden gute Entdeckungen.", "Turn source information into great discoveries.")}</h1><span>{say("Importieren, prüfen und gezielt veröffentlichen. Ein gemeinsamer Katalog für Kinder und Eltern.", "Import, review and publish your selection. One shared catalogue for children and parents.")}</span></div><a className="btn" href="/" target="_blank" rel="noopener noreferrer">{say("Öffentlichen Katalog öffnen ↗", "Open public catalogue ↗")}</a></section>
        <div className="org-connection" role="status"><strong>{adminMissing ? say("Lokale Verwaltung deaktiviert", "Local admin disabled") : summary ? say("Mit dem Katalog verbunden", "Connected to the catalogue") : say("Verbindung wird geprüft…", "Checking connection…")}</strong>{summary && !adminMissing ? <span>{summary.publishedRealCount} {say("geprüfte echte Angebote", "reviewed real activities")} · {say("Katalogversion", "catalogue version")} {summary.catalogueVersion}</span> : <span>{say("Schreibzugriff nur lokal und nach ausdrücklicher Prüfung.", "Local writes only, with explicit review before publication.")}</span>}</div>
        <ol className="org-workflow"><li><b>1</b>{say("Quelle / CSV auswählen", "Choose source / CSV")}</li><li><b>2</b>{say("Zeilen prüfen & korrigieren", "Review & correct rows")}</li><li><b>3</b>{say("Auswahl veröffentlichen", "Publish your selection")}</li></ol>
        {!adminMissing ? <form className="org-resume" onSubmit={e => { e.preventDefault(); void run("resume", async () => { adoptSession(await fetchSession(resumeId.trim(), taxonomy ?? undefined), false); setNotice(t("org.resumed", { id: resumeId.trim() })); }); }}><label>{say("Vorhandene Prüfung öffnen", "Resume an existing review")}<input type="text" value={resumeId} onChange={e => setResumeId(e.target.value)} placeholder={say("Prüfungs-ID", "Review ID")} required maxLength={36} /></label><button type="submit" className="btn" disabled={busy !== null || !resumeId.trim()}>{say("Prüfung laden", "Load review")}</button></form> : null}
        {publicApiMissing ? <p className="status-line" data-tone="warn">{t("org.checkConnection")}</p> : null}
        {adminMissing ? (
          <div className="panel org__missing">
            <h2>{t("org.missingTitle")}</h2>
            <p className="muted">{t("org.missingBodyPre")}<code>INTEREST_ATLAS_LOCAL_DESK=1</code>{t("org.missingBodyPost")}</p>
            <div className="row">
              <button type="button" className="btn" onClick={loadExample} disabled={busy !== null}>{t("org.viewExample")}</button>
              <button type="button" className="btn" onClick={checkConnection}>{t("org.retry")}</button>
            </div>
          </div>
        ) : null}

        {tab === "review" ? (
          <>
            <section className="panel org__upload" aria-labelledby="org-upload-title">
              <h2 id="org-upload-title">{t("org.uploadTitle")}</h2>
              <div className="org__upload-row">
                <label className="dz-field"><span>{t("org.provider")}</span>
                  <select value={providerId} onChange={e => setProviderId(e.target.value)}>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></label>
                <label className="dz-field"><span>{t("org.mode")}</span>
                  <select value={mode} onChange={e => setMode(e.target.value as "demo" | "source")}>
                    <option value="demo">{t("org.modeDemo")}</option>
                    <option value="source">{t("org.modeSource")}</option>
                  </select></label>
                <a className="btn" href="/api/admin/import-template" download>{t("org.template")}</a>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="visually-hidden" id="org-file"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
                <button type="button" className="btn btn--primary" disabled={adminMissing || !providerId || busy !== null} onClick={() => fileRef.current?.click()}>
                  {busy === "upload" ? t("org.checking") : t("org.upload")}
                </button>
              </div>
              <p className="muted org__hint">{t("org.uploadHint")}</p>
            </section>

            {error ? <p className="status-line" data-tone="bad" role="alert">{error}</p> : null}
            {notice ? <p className="status-line" data-tone="ok" role="status">{notice}</p> : null}
            {approveResult ? (
              <div className="panel org__result" role="status">
                <h3>{t("org.publishedTitle")}</h3>
                <p>{t("org.publishedLine", { published: approveResult.publishedCount, blocked: approveResult.blockedCount,
                  unchanged: approveResult.unchangedCount, version: approveResult.catalogueVersion })}</p>
              </div>
            ) : null}

            {session ? (
              <section className="org__session" aria-labelledby="org-session-title">
                <div className="org__session-head">
                  <h2 id="org-session-title">{t("org.importHead", { id: session.importId })}</h2>
                  <span className={session.mode === "demo" ? "tag tag--demo" : "tag tag--verified"}>{t(session.mode === "demo" ? "org.demoData" : "org.sourceData")}</span>
                  <span className="tag">{t("org.revision", { n: session.revision })}</span>
                  {localOnly ? <span className="tag tag--stale">{t("org.viewOnly")}</span> : (
                    <button type="button" className="dz-link" onClick={onReload} disabled={busy !== null}>{t("org.reload")}</button>
                  )}
                </div>
                {counts ? (
                  <div className="row org__counts">
                    {STATES.map(s => (
                      <span key={s} className="org-count" data-tone={STATE_TONE[s]}>{counts[s]} {t(`state.${s}`)}</span>
                    ))}
                  </div>
                ) : null}
                <div className="org__rows">
                  {session.rows.map((row, n) => {
                    const title = (row.candidate ? pick(row.candidate.title, locale) : "")
                      || (row.draft as { title?: { de?: string } } | undefined)?.title?.de || t("org.noTitle");
                    const selectable = selectableRow(row) && !localOnly;
                    return (
                      <article key={row.rowId} className={`org-row panel${openRow === row.rowId ? " is-open" : ""}`} style={{ "--i": Math.min(n, 10) } as CSSProperties}>
                        <div className="org-row__line">
                          <input type="checkbox" id={`sel-${row.rowId}`} checked={selected.includes(row.rowId)} disabled={!selectable}
                            onChange={e => setSelected(s => (e.target.checked ? [...s, row.rowId] : s.filter(x => x !== row.rowId)))}
                            aria-label={t("org.selectRow", { title })} />
                          <span className="org-row__state" data-tone={STATE_TONE[row.state]}>{t(`state.${row.state}`)}</span>
                          <div className="org-row__title">
                            <h3>{title}</h3>
                            <p className="muted">
                              {row.rowId}
                              {row.candidate ? ` · ${formatPrice(row.candidate, locale)}` : ""}
                              {row.changedFields.length ? t("org.changed", { fields: row.changedFields.join(", ") }) : ""}
                            </p>
                          </div>
                          <button type="button" className="btn" aria-expanded={openRow === row.rowId}
                            onClick={() => setOpenRow(o => (o === row.rowId ? null : row.rowId))}>
                            {t(openRow === row.rowId ? "org.collapse" : "org.reviewFix")}
                          </button>
                        </div>
                        {row.issues.length ? (
                          <ul className="org-row__issues">
                            {row.issues.map((issue, i) => <li key={i}><code>{issue.path}</code> {issue.message}</li>)}
                          </ul>
                        ) : null}
                        {session.notes?.[row.rowId]?.length ? <ul className="org-row__issues">{session.notes[row.rowId]!.map((note, i) => <li key={i}>{note}</li>)}</ul> : null}
                        {openRow === row.rowId ? (
                          <RowEditor row={row} locale={locale} t={t} disabled={localOnly || busy !== null} busy={busy === `patch:${row.rowId}`}
                            onSave={changes => onPatch(row, changes)} />
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                <div className="org__publish panel">
                  <p>
                    {t("org.selectedOf", { n: selected.length, total: readyIds.length })}
                    {counts?.blocked ? t("org.blockedNote", { n: counts.blocked }) : ""}
                  </p>
                  <label className="org-review-confirm"><input type="checkbox" checked={reviewConfirmed} disabled={localOnly || !selected.length || busy !== null} onChange={e => setReviewToken(e.target.checked ? approvalToken : null)} /><span>{say("Ich habe die ausgewählten Zeilen und ihre Quellen geprüft. Nur diese Auswahl veröffentlichen.", "I reviewed the selected rows and their sources. Publish only this selection.")}</span></label>
                  <div className="row">
                    <button type="button" className="btn" disabled={localOnly || !readyIds.length}
                      onClick={() => setSelected(s => (s.length === readyIds.length ? [] : readyIds))}>
                      {t(selected.length === readyIds.length && readyIds.length ? "org.clearSelection" : "org.selectAllReady")}
                    </button>
                    <button type="button" className="btn btn--primary" disabled={localOnly || !selected.length || busy !== null || !reviewConfirmed} onClick={onApprove}>
                      {busy === "approve" ? t("org.publishing") : t("org.publishSelected", { n: selected.length })}
                    </button>
                  </div>
                  {localOnly ? <p className="muted">{t("org.publishNeedsServer")}</p> : null}
                </div>
              </section>
            ) : !adminMissing ? (
              <div className="org__empty panel">
                <h3>{t("org.emptyTitle")}</h3>
                <p className="muted">{t("org.emptyBody")}</p>
              </div>
            ) : null}
          </>
        ) : (
          <SourcesPanel taxonomy={taxonomy} locale={locale} t={t} statuses={statuses} scrape={scrape} watching={watchRunId !== null}
            disabled={adminMissing || busy !== null || watchRunId !== null}
            onCheckRun={() => scrape && setWatchRunId(scrape.runId)}
            onReview={pid => run("source-review", async () => {
              adoptSession(await importFromSource(pid, taxonomy ?? undefined), false); setTab("review");
            })}
            onScrape={pid => run("scrape", async () => {
              const r = await startScrapeRun(pid);
              setScrape({ runId: r.runId, status: "queued", results: [] }); setWatchRunId(r.runId);
              setNotice(t("org.runStarted", { id: r.runId, status: r.status }));
            })}
            onTaxonomy={setTaxonomy} notice={notice} error={error} onError={setError} onNotice={setNotice} />
        )}
      </main>
    </div>
  );
}

function RowEditor({ row, locale, t, disabled, busy, onSave }: {
  row: ReviewRow; locale: Locale; t: Translate; disabled: boolean; busy: boolean; onSave: (changes: ReviewFieldPatch) => void;
}) {
  const c = row.candidate;
  const draft = (row.draft ?? {}) as { title?: { de?: string }; priceEur?: number | null };
  const [title, setTitle] = useState(c?.title.de ?? draft.title?.de ?? "");
  const [price, setPrice] = useState(c?.priceEur ?? draft.priceEur ?? ("" as number | ""));
  const [minAge, setMinAge] = useState<number | "">(c?.minAge ?? "");
  const [maxAge, setMaxAge] = useState<number | "">(c?.maxAge ?? "");
  const [startDate, setStartDate] = useState(c?.startDate ?? "");
  const [availability, setAvailability] = useState<Offer["availability"]>(c?.availability ?? "unknown");

  const save = () => {
    const changes: ReviewFieldPatch = {};
    if (title !== (c?.title.de ?? draft.title?.de ?? "")) changes.title = { de: title };
    if (price !== (c?.priceEur ?? draft.priceEur ?? "")) changes.priceEur = price === "" ? null : Number(price);
    if (minAge !== (c?.minAge ?? "")) changes.minAge = minAge === "" ? null : Number(minAge);
    if (maxAge !== (c?.maxAge ?? "")) changes.maxAge = maxAge === "" ? null : Number(maxAge);
    if (startDate !== (c?.startDate ?? "")) changes.startDate = startDate || null;
    if (availability !== (c?.availability ?? "unknown")) changes.availability = availability;
    if (Object.keys(changes).length) onSave(changes);
  };

  return (
    <div className="org-edit">
      <label className="dz-field org-edit__wide"><span>{t("org.editTitle")}</span>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="dz-field"><span>{t("org.editPrice")}</span>
        <input type="number" min="0" step="0.5" value={price} onChange={e => setPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder={t("org.unknownPlaceholder")} /></label>
      <label className="dz-field"><span>{t("org.editMinAge")}</span>
        <input type="number" min="0" max="25" value={minAge} onChange={e => setMinAge(e.target.value === "" ? "" : Number(e.target.value))} placeholder={t("org.unknownPlaceholder")} /></label>
      <label className="dz-field"><span>{t("org.editMaxAge")}</span>
        <input type="number" min="0" max="25" value={maxAge} onChange={e => setMaxAge(e.target.value === "" ? "" : Number(e.target.value))} placeholder={t("org.unknownPlaceholder")} /></label>
      <label className="dz-field"><span>{t("org.editDate")}</span>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
      <label className="dz-field"><span>{t("org.editPlaces")}</span>
        <select value={availability} onChange={e => setAvailability(e.target.value as Offer["availability"])}>
          {AVAILABILITIES.map(a => <option key={a} value={a}>{availabilityLabel(a, locale)}</option>)}
        </select></label>
      <div className="row org-edit__actions">
        <button type="button" className="btn btn--primary" onClick={save} disabled={disabled}>
          {t(busy ? "org.checking" : "org.saveRecheck")}
        </button>
        {disabled && !busy ? <span className="muted">{t("org.needsServer")}</span> : <span className="muted">{t("org.recheckNote")}</span>}
      </div>
    </div>
  );
}

function SourcesPanel({ taxonomy, locale, t, disabled, onScrape, onReview, statuses, scrape, watching, onCheckRun, onTaxonomy, notice, error, onError, onNotice }: {
  taxonomy: Taxonomy | null; locale: Locale; t: Translate; disabled: boolean;
  statuses: SourceStatus[]; scrape: ScrapeRun | null; watching: boolean; onCheckRun: () => void;
  onReview: (providerId: string) => void;
  onScrape: (providerId: string | "all") => void;
  /** A saved theme change replaces the desk's taxonomy, so the review tab validates against it. */
  onTaxonomy: (next: Taxonomy) => void;
  notice: string | null; error: string | null;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const [sources, setSources] = useState<AdminProviderView[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<"source" | "topic" | "interest" | null>(null);

  const load = useCallback(() => {
    fetchAdminProviders().then(setSources).catch(() => setSources(null));
  }, []);
  useEffect(() => { if (!disabled) load(); }, [disabled, load]);

  const act = async (label: string, work: () => Promise<string>) => {
    setBusy(label); onError(null); onNotice(null);
    try { onNotice(await work()); }
    catch (err) {
      if (err instanceof ServiceMissingError) onError(t("org.configNeedsServer"));
      else onError(err instanceof AdminApiError ? err.message : t("org.unexpected"));
    }
    finally { setBusy(null); }
  };

  const saveSource = (change: ProviderChange) => act(`src:${change.id}`, async () => {
    const { provider, created, note } = await saveProvider(change);
    load(); setEditing(null); setAdding(null);
    return `${t(created ? "org.sourceCreated" : "org.sourceSaved", { name: provider.name })}${note ? ` ${note}` : ""}`;
  });
  const saveTax = (change: TopicChange, what: string) => act(`tax:${change.kind}:${change.id}`, async () => {
    const next = await saveTopic(change);
    onTaxonomy(next); setAdding(null); setEditing(null);
    return t("org.taxSaved", { what, version: next.version });
  });

  return (
    <section className="org__sources" aria-labelledby="org-sources-title">
      <div className="org__session-head">
        <h2 id="org-sources-title">{t("org.sourcesTitle")}</h2>
        <button type="button" className="btn" disabled={disabled} onClick={() => onScrape("all")}>{t("org.refreshAll")}</button>
        <button type="button" className="btn" disabled={disabled} onClick={() => { setAdding(a => (a === "source" ? null : "source")); setEditing(null); }}>
          {t("org.addSource")}
        </button>
      </div>
      {error ? <p className="status-line" data-tone="bad" role="alert">{error}</p> : null}
      {notice ? <p className="status-line" data-tone="ok" role="status">{notice}</p> : null}
      {scrape ? <div className="panel" role="status"><p>{t("org.runLine", { id: scrape.runId, state: t(scrape.status === "done" ? "org.runDone" : "org.runRunning") })}</p>
        {scrape.results.map(result => <p key={result.providerId}>{result.providerId}: {result.message}</p>)}
        {!watching && scrape.status !== "done" ? <button className="btn" onClick={onCheckRun}>{t("org.checkStatus")}</button> : null}</div> : null}
      {disabled ? <p className="muted">{t("org.sourcesNeedServerPre")}<code>INTEREST_ATLAS_LOCAL_DESK=1</code>.</p> : null}

      {adding === "source" ? (
        <SourceForm t={t} busy={busy === "src:"} disabled={disabled}
          onCancel={() => setAdding(null)} onSave={saveSource} />
      ) : null}

      <div className="org__provider-grid">
        {(sources ?? []).map(p => (
          <article key={p.id} className={`panel org-provider${p.enabled ? "" : " is-off"}`}>
            <div className="org-provider__head">
              <h3>{p.name}</h3>
              <span className={p.enabled ? "tag tag--verified" : "tag tag--unknown"}>{t(p.enabled ? "org.active" : "org.disabled")}</span>
            </div>
            <p className="muted org-provider__meta">
              <code>{p.id}</code> · {t(p.adapter === "implemented" ? "org.adapterYes" : "org.adapterNo")}
              {p.permissionStatus ? t("org.permission", { status: p.permissionStatus }) : ""}
            </p>
            {statuses.filter(s => s.providerId === p.id).map(s => (
              <p key={s.providerId} className="muted">
                {s.message} {t("org.sourceCounts", { n: s.extractedCount, rejected: s.rejectedCount })}{" "}
                {s.lastSuccessfulImportAt
                  ? t("org.dataAsOf", { stamp: formatStamp(s.lastSuccessfulImportAt, locale) ?? "" })
                  : t("org.noSuccessfulRun")}
              </p>
            ))}
            {p.discoveryUrl ? <a href={p.discoveryUrl} target="_blank" rel="noreferrer">{t("org.openSourcePage")}</a> : <p className="muted">{t("org.noSourcePage")}</p>}
            {editing === p.id ? (
              <SourceForm source={p} t={t} busy={busy === `src:${p.id}`} disabled={disabled}
                onCancel={() => setEditing(null)} onSave={saveSource} />
            ) : (
              <div className="row">
                <button type="button" className="btn" disabled={disabled} onClick={() => { setEditing(p.id); setAdding(null); }}>{t("org.edit")}</button>
                <button type="button" className="btn" disabled={disabled || busy !== null}
                  onClick={() => saveSource({ id: p.id, enabled: !p.enabled })}>
                  {t(p.enabled ? "org.deactivate" : "org.activate")}
                </button>
                <button type="button" className="btn" disabled={disabled || p.adapter !== "implemented"} onClick={() => onScrape(p.id)}
                  title={p.adapter === "implemented" ? undefined : t("org.noAdapterTitle")}>
                  {t("org.refresh")}
                </button>
                <button type="button" className="btn" disabled={disabled || busy !== null || p.adapter !== "implemented"} onClick={() => onReview(p.id)}>{t("org.reviewChanges")}</button>
              </div>
            )}
          </article>
        ))}
      </div>
      {sources && !sources.length ? <p className="muted">{t("org.noSources")}</p> : null}
      {!sources && !disabled ? <p className="muted">{t("org.loadingSources")}</p> : null}
      <p className="muted org__hint">{t("org.sourcesRules")}</p>

      <div className="org__session-head">
        <h2>{t("org.taxTitle")}</h2>
        <button type="button" className="btn" disabled={disabled} onClick={() => { setAdding(a => (a === "topic" ? null : "topic")); setEditing(null); }}>{t("org.addTopic")}</button>
        <button type="button" className="btn" disabled={disabled || !taxonomy?.topics.length} onClick={() => { setAdding(a => (a === "interest" ? null : "interest")); setEditing(null); }}>{t("org.addInterest")}</button>
      </div>
      {adding === "topic" ? <TaxonomyForm kind="topic" locale={locale} t={t} busy={busy !== null} disabled={disabled} onCancel={() => setAdding(null)} onSave={saveTax} /> : null}
      {adding === "interest" && taxonomy ? <TaxonomyForm kind="interest" locale={locale} t={t} topics={taxonomy.topics} busy={busy !== null} disabled={disabled} onCancel={() => setAdding(null)} onSave={saveTax} /> : null}
      {taxonomy ? (
        <div className="org__tax">
          <p className="muted">{t("org.configVersion", { n: taxonomy.version })}</p>
          <TaxList kind="topic" locale={locale} t={t} entries={taxonomy.topics.map(topic => ({ id: topic.id, label: topic.label, enabled: topic.enabled }))}
            disabled={disabled} busy={busy} editing={editing} setEditing={setEditing} onSave={saveTax} />
          <TaxList kind="interest" locale={locale} t={t} entries={taxonomy.interests.map(i => ({ id: i.id, label: i.label, enabled: i.enabled, topicIds: i.topicIds }))}
            topics={taxonomy.topics} disabled={disabled} busy={busy} editing={editing} setEditing={setEditing} onSave={saveTax} />
        </div>
      ) : <p className="muted">{t("org.topicsNotLoaded")}</p>}
    </section>
  );
}

interface TaxEntry { id: string; label: { de: string; en: string }; enabled: boolean; topicIds?: readonly string[] }
type TaxTopic = { id: string; label: { de: string; en: string } };

function TaxList({ kind, locale, t, entries, topics, disabled, busy, editing, setEditing, onSave }: {
  kind: "topic" | "interest"; locale: Locale; t: Translate; entries: TaxEntry[]; topics?: readonly TaxTopic[];
  disabled: boolean; busy: string | null; editing: string | null;
  setEditing: (id: string | null) => void; onSave: (change: TopicChange, what: string) => void;
}) {
  return (
    <div className="org-tax-list">
      <h3>{t(kind === "topic" ? "org.topics" : "org.interests")}</h3>
      {entries.map(e => (
        <div key={e.id} className={`org-tax-row${e.enabled ? "" : " is-off"}`}>
          <div className="org-tax-row__text">
            <strong>{pick(e.label, locale)}</strong> <span className="muted">{locale === "en" ? e.label.de : e.label.en} · <code>{e.id}</code></span>
            {e.topicIds?.length && topics ? (
              <span className="muted"> · {e.topicIds.map(id => { const found = topics.find(topic => topic.id === id); return found ? pick(found.label, locale) : id; }).join(", ")}</span>
            ) : null}
            {e.enabled ? null : <span className="tag tag--unknown">{t("org.disabled")}</span>}
          </div>
          <div className="row">
            <button type="button" className="btn" disabled={disabled} onClick={() => setEditing(editing === `${kind}:${e.id}` ? null : `${kind}:${e.id}`)}>{t("org.edit")}</button>
            <button type="button" className="btn" disabled={disabled || busy !== null}
              onClick={() => onSave({ kind, id: e.id, enabled: !e.enabled },
                t(e.enabled ? "org.taxDeactivated" : "org.taxActivated", { kind: t(`kind.${kind}`), label: pick(e.label, locale) }))}>
              {t(e.enabled ? "org.deactivate" : "org.activate")}
            </button>
          </div>
          {editing === `${kind}:${e.id}` ? (
            <TaxonomyForm kind={kind} locale={locale} t={t} entry={e} topics={topics}
              busy={busy !== null} disabled={disabled} onCancel={() => setEditing(null)} onSave={onSave} />
          ) : null}
        </div>
      ))}
      {!entries.length ? <p className="muted">{t("org.noEntries")}</p> : null}
    </div>
  );
}

/** Add or edit one theme/interest. The ID of an existing entry is never editable. */
function TaxonomyForm({ kind, locale, t, entry, topics, busy, disabled, onCancel, onSave }: {
  kind: "topic" | "interest"; locale: Locale; t: Translate; entry?: TaxEntry; topics?: readonly TaxTopic[];
  busy: boolean; disabled: boolean; onCancel: () => void; onSave: (change: TopicChange, what: string) => void;
}) {
  const [id, setId] = useState(entry?.id ?? "");
  const [de, setDe] = useState(entry?.label.de ?? "");
  const [en, setEn] = useState(entry?.label.en ?? "");
  const [picked, setPicked] = useState<string[]>([...(entry?.topicIds ?? [])]);
  const [local, setLocal] = useState<string | null>(null);

  const submit = () => {
    const trimmed = id.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed) || trimmed.length > 40) { setLocal(t("org.idRule")); return; }
    if (!de.trim() || !en.trim()) { setLocal(t("org.bothLabels")); return; }
    if (kind === "interest" && !picked.length) { setLocal(t("org.pickTopic")); return; }
    setLocal(null);
    const change: TopicChange = { kind, id: trimmed, label: { de: de.trim(), en: en.trim() } };
    if (kind === "interest") change.topicIds = picked;
    onSave(change, t("org.taxNamed", { kind: t(`kind.${kind}`), label: (locale === "en" ? en : de).trim() }));
  };

  return (
    <div className="org-edit">
      <label className="dz-field"><span>{t("org.idLabel")}</span>
        <input type="text" value={id} disabled={!!entry} onChange={e => setId(e.target.value)} placeholder="z-b-robotik" /></label>
      <label className="dz-field"><span>{t("org.labelDe")}</span>
        <input type="text" value={de} onChange={e => setDe(e.target.value)} /></label>
      <label className="dz-field"><span>{t("org.labelEn")}</span>
        <input type="text" value={en} onChange={e => setEn(e.target.value)} /></label>
      {kind === "interest" && topics ? (
        <fieldset className="org-edit__wide org-edit__fieldset">
          <legend>{t("org.topics")}</legend>
          {topics.map(topic => (
            <label key={topic.id} className="dz-check">
              <input type="checkbox" checked={picked.includes(topic.id)}
                onChange={e => setPicked(p => (e.target.checked ? [...p, topic.id] : p.filter(x => x !== topic.id)))} />
              {pick(topic.label, locale)}
            </label>
          ))}
        </fieldset>
      ) : null}
      {local ? <p className="status-line org-edit__wide" data-tone="bad" role="alert">{local}</p> : null}
      <div className="row org-edit__actions">
        <button type="button" className="btn btn--primary" disabled={disabled || busy} onClick={submit}>{t(busy ? "org.saving" : "org.save")}</button>
        <button type="button" className="btn" onClick={onCancel}>{t("org.cancel")}</button>
        {entry ? <span className="muted">{t("org.idKept")}</span> : null}
      </div>
    </div>
  );
}

/** Add or edit one source. An existing source keeps its ID and its allowed hosts. */
function SourceForm({ source, t, busy, disabled, onCancel, onSave }: {
  source?: AdminProviderView; t: Translate; busy: boolean; disabled: boolean;
  onCancel: () => void; onSave: (change: ProviderChange) => void;
}) {
  const [id, setId] = useState(source?.id ?? "");
  const [name, setName] = useState(source?.name ?? "");
  const [url, setUrl] = useState(source?.discoveryUrl ?? "");
  const [local, setLocal] = useState<string | null>(null);

  const submit = () => {
    const trimmed = id.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed) || trimmed.length > 40) { setLocal(t("org.idRule")); return; }
    if (!name.trim() || name.length > 120) { setLocal(t("org.nameRule")); return; }
    let parsed: URL;
    try { parsed = new URL(url.trim()); } catch { setLocal(t("org.urlRule")); return; }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) { setLocal(t("org.urlSimple")); return; }
    if (source?.allowedHosts.length && !source.allowedHosts.includes(parsed.hostname)) {
      setLocal(t("org.hostStay", { hosts: source.allowedHosts.join(", ") })); return;
    }
    setLocal(null);
    onSave({ id: trimmed, name: name.trim(), discoveryUrl: parsed.toString() });
  };

  return (
    <div className="org-edit panel">
      <label className="dz-field"><span>{t("org.idLabel")}</span>
        <input type="text" value={id} disabled={!!source} onChange={e => setId(e.target.value)} placeholder="z-b-stadtbibliothek" /></label>
      <label className="dz-field org-edit__wide"><span>{t("org.name")}</span>
        <input type="text" value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="dz-field org-edit__wide"><span>{t("org.sourcePage")}</span>
        <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" /></label>
      {local ? <p className="status-line org-edit__wide" data-tone="bad" role="alert">{local}</p> : null}
      <div className="row org-edit__actions">
        <button type="button" className="btn btn--primary" disabled={disabled || busy} onClick={submit}>{t(busy ? "org.saving" : "org.save")}</button>
        <button type="button" className="btn" onClick={onCancel}>{t("org.cancel")}</button>
        <span className="muted">
          {source
            ? t("org.hostsKept", { hosts: source.allowedHosts.join(", ") || t("org.noHosts") })
            : t("org.newSourceNote")}
        </span>
      </div>
    </div>
  );
}
