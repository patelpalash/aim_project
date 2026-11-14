"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Offer, Taxonomy } from "@/shared/contracts";
import type { ProviderSummary } from "@/shared/api-contract";
import { countReviewRows, validateReviewSession, type ReviewFieldPatch, type ReviewRow, type ReviewSession } from "@/shared/review";
import { validateTaxonomy } from "@/shared/taxonomy";
import { formatPrice } from "../atlas/format";
import {
  AdminApiError, ServiceMissingError, approveRows, fetchAdminProviders, fetchProviders, fetchSession, fetchTaxonomy,
  patchRow, saveProvider, saveTopic, startScrapeRun, uploadCsv,
  type AdminProviderView, type ApproveResult, type ProviderChange, type TopicChange
} from "./api";
import "./organizer.css";

const STATE_LABEL: Record<ReviewRow["state"], string> = {
  "ready-new": "Bereit (neu)", "ready-update": "Bereit (Update)", "needs-review": "Prüfen", blocked: "Blockiert", unchanged: "Unverändert"
};
const STATE_TONE: Record<ReviewRow["state"], string> = { "ready-new": "ok", "ready-update": "ok", "needs-review": "warn", blocked: "bad", unchanged: "muted" };
const AVAILABILITIES = ["available", "full", "cancelled", "unknown"] as const;
const LAST_IMPORT_KEY = "atlas.organizer.importId";
const AVAIL_LABEL: Record<string, string> = { available: "Plätze frei", full: "Ausgebucht", cancelled: "Abgesagt", unknown: "Unbekannt" };

/**
 * I5: the organizer desk — CSV template/upload, readable row states, inline correction via the
 * server, selection and "Publish selected valid rows". A calm neutral tool in the clean-studio
 * system. While Umang's /api/admin routes return 404, the desk says so and can only show the
 * contract example session read-only; nothing is ever faked as published.
 */
export function OrganizerDesk() {
  const [tab, setTab] = useState<"review" | "sources">("review");
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [publicApiMissing, setPublicApiMissing] = useState(false);
  const [adminMissing, setAdminMissing] = useState(false);
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
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, t] = await Promise.all([fetchProviders(), fetchTaxonomy()]);
        if (!alive) return;
        setProviders(p); setTaxonomy(t); setProviderId(prev => prev || p[0]?.id || "");
      } catch {
        // Public config routes are not up yet: fall back to the repo fixtures, visibly.
        try {
          const [p, t] = await Promise.all([
            import("../../../data/providers.json").then(m => ((m.default ?? m) as { id: string; name: string; discoveryUrl: string }[]).map(x => ({ id: x.id, name: x.name, discoveryUrl: x.discoveryUrl }))),
            import("../../../data/taxonomy.json").then(m => {
              const valid = validateTaxonomy(m.default ?? m);
              return valid.ok ? valid.taxonomy : null;
            })
          ]);
          if (!alive) return;
          setProviders(p); setTaxonomy(t); setPublicApiMissing(true); setProviderId(prev => prev || p[0]?.id || "");
        } catch { if (alive) setError("Konfiguration konnte nicht geladen werden."); }
      }
    })();
    return () => { alive = false; };
  }, []);

  const adoptSession = useCallback((next: ReviewSession, local: boolean) => {
    setSession(next); setLocalOnly(local); setApproveResult(null); setOpenRow(null);
    setSelected(prev => next.rows.filter(r => prev.includes(r.rowId) && r.state.startsWith("ready")).map(r => r.rowId));
    // Remember the import for this tab only, so a reload resumes the same review.
    try { if (local) sessionStorage.removeItem(LAST_IMPORT_KEY); else sessionStorage.setItem(LAST_IMPORT_KEY, next.importId); } catch { /* private mode */ }
  }, []);

  // Resume the review after a reload. A missing or expired import is simply dropped.
  useEffect(() => {
    let alive = true;
    let importId: string | null = null;
    try { importId = sessionStorage.getItem(LAST_IMPORT_KEY); } catch { importId = null; }
    if (!importId) return;
    fetchSession(importId, taxonomy ?? undefined)
      .then(next => { if (alive) { adoptSession(next, false); setNotice(`Import ${next.importId} fortgesetzt.`); } })
      .catch(() => { try { sessionStorage.removeItem(LAST_IMPORT_KEY); } catch { /* ignore */ } });
    return () => { alive = false; };
    // Runs once the taxonomy is known so the session validates against the configured one.
  }, [taxonomy, adoptSession]);

  const run = async (label: string, work: () => Promise<void>) => {
    setBusy(label); setError(null); setNotice(null);
    try { await work(); }
    catch (err) {
      if (err instanceof ServiceMissingError) { setAdminMissing(true); setError(null); }
      else setError(err instanceof AdminApiError ? err.message : "Unerwarteter Fehler.");
    }
    finally { setBusy(null); }
  };

  const onUpload = (file: File) => run("upload", async () => {
    const next = await uploadCsv(file, providerId, mode, taxonomy ?? undefined);
    adoptSession(next, false);
    setNotice(`Import ${next.importId} geladen: ${next.rows.length} Zeilen.`);
  });

  const onReload = () => session && run("reload", async () => adoptSession(await fetchSession(session.importId, taxonomy ?? undefined), false));

  const onPatch = (row: ReviewRow, changes: ReviewFieldPatch) => session && run(`patch:${row.rowId}`, async () => {
    const next = await patchRow(session.importId, row.rowId, session.revision, changes, taxonomy ?? undefined);
    adoptSession(next, false);
    setNotice("Zeile gespeichert und neu geprüft.");
  });

  const onApprove = () => session && run("approve", async () => {
    const result = await approveRows(session.importId, selected, session.revision);
    setNotice(null);
    // Refresh first: adoptSession clears the previous result, so the new one is set afterwards.
    const next = await fetchSession(session.importId, taxonomy ?? undefined).catch(() => null);
    if (next) adoptSession(next, false);
    setApproveResult(result);
  });

  const loadExample = () => run("example", async () => {
    const raw = await import("../../../examples/review-session.json");
    const valid = validateReviewSession(raw.default ?? raw, taxonomy ?? undefined);
    if (!valid.ok) throw new AdminApiError("Beispiel-Session ist ungültig.");
    adoptSession(valid.session, true);
    setNotice("Beispiel-Session aus docs/CONTRACT.md geladen — nur zum Ansehen, ohne Server.");
  });

  const counts = useMemo(() => (session ? countReviewRows(session.rows) : null), [session]);
  const readyIds = session?.rows.filter(r => r.state.startsWith("ready")).map(r => r.rowId) ?? [];

  return (
    <div className="org">
      <a className="skip-link" href="#org-main">Zum Inhalt springen</a>
      <header className="org__top">
        <div className="wrap org__top-in">
          <a className="dz-logo" href="/"><span className="dz-logo__mark" aria-hidden="true" />Interest Atlas</a>
          <span className="tag">Organizer-Bereich</span>
          <div className="dz-view" role="group" aria-label="Bereich">
            <button type="button" aria-pressed={tab === "review"} onClick={() => setTab("review")}>Import & Review</button>
            <button type="button" aria-pressed={tab === "sources"} onClick={() => setTab("sources")}>Quellen & Themen</button>
          </div>
        </div>
      </header>

      <main className="wrap org__main" id="org-main" tabIndex={-1}>
        {publicApiMissing ? <p className="status-line" data-tone="warn">Konfigurations-API fehlt noch; Anbieter und Themen kommen aus den Repo-Fixtures.</p> : null}
        {adminMissing ? (
          <div className="panel org__missing">
            <h2>Der Review-Server antwortet hier nicht.</h2>
            <p className="muted">Upload, Korrektur und Veröffentlichen laufen über die /api/admin-Routen. Sie sind absichtlich nur lokal freigeschaltet: Starte die App mit <code>INTEREST_ATLAS_LOCAL_DESK=1</code>, sonst antworten sie mit 404. Ohne das Flag kannst du hier nur die Beispiel-Session ansehen.</p>
            <div className="row">
              <button type="button" className="btn" onClick={loadExample} disabled={busy !== null}>Beispiel-Session ansehen (Demo)</button>
              <button type="button" className="btn" onClick={() => setAdminMissing(false)}>Nochmal versuchen</button>
            </div>
          </div>
        ) : null}

        {tab === "review" ? (
          <>
            <section className="panel org__upload" aria-labelledby="org-upload-title">
              <h2 id="org-upload-title">CSV-Import</h2>
              <div className="org__upload-row">
                <label className="dz-field"><span>Anbieter</span>
                  <select value={providerId} onChange={e => setProviderId(e.target.value)}>
                    {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select></label>
                <label className="dz-field"><span>Modus</span>
                  <select value={mode} onChange={e => setMode(e.target.value as "demo" | "source")}>
                    <option value="demo">Demo (erfundene Beispiele)</option>
                    <option value="source">Quelle (echte Daten)</option>
                  </select></label>
                <a className="btn" href="/api/admin/import-template" download>CSV-Vorlage laden</a>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="visually-hidden" id="org-file"
                  onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
                <button type="button" className="btn btn--primary" disabled={!providerId || busy !== null} onClick={() => fileRef.current?.click()}>
                  {busy === "upload" ? "Wird geprüft…" : "CSV hochladen"}
                </button>
              </div>
              <p className="muted org__hint">Hochladen erzeugt nur eine Vorschau. Veröffentlicht wird erst nach deiner Auswahl, und blockierte Zeilen nie.</p>
            </section>

            {error ? <p className="status-line" data-tone="bad" role="alert">{error}</p> : null}
            {notice ? <p className="status-line" data-tone="ok" role="status">{notice}</p> : null}
            {approveResult ? (
              <div className="panel org__result" role="status">
                <h3>Veröffentlichung abgeschlossen</h3>
                <p><strong>{approveResult.publishedCount}</strong> veröffentlicht · <strong>{approveResult.blockedCount}</strong> blockiert geblieben · <strong>{approveResult.unchangedCount}</strong> unverändert · Katalogversion {approveResult.catalogueVersion}</p>
              </div>
            ) : null}

            {session ? (
              <section className="org__session" aria-labelledby="org-session-title">
                <div className="org__session-head">
                  <h2 id="org-session-title">Import {session.importId}</h2>
                  <span className={session.mode === "demo" ? "tag tag--demo" : "tag tag--verified"}>{session.mode === "demo" ? "Demo-Daten" : "Quelldaten"}</span>
                  <span className="tag">Revision {session.revision}</span>
                  {localOnly ? <span className="tag tag--stale">Nur Ansicht, ohne Server</span> : (
                    <button type="button" className="dz-link" onClick={onReload} disabled={busy !== null}>Neu laden</button>
                  )}
                </div>
                {counts ? (
                  <div className="row org__counts">
                    {(Object.keys(STATE_LABEL) as ReviewRow["state"][]).map(s => (
                      <span key={s} className="org-count" data-tone={STATE_TONE[s]}>{counts[s]} {STATE_LABEL[s]}</span>
                    ))}
                  </div>
                ) : null}
                <div className="org__rows">
                  {session.rows.map((row, n) => {
                    const title = row.candidate?.title.de || (row.draft as { title?: { de?: string } } | undefined)?.title?.de || "(ohne Titel)";
                    const selectable = row.state.startsWith("ready") && !localOnly;
                    return (
                      <article key={row.rowId} className={`org-row panel${openRow === row.rowId ? " is-open" : ""}`} style={{ "--i": Math.min(n, 10) } as CSSProperties}>
                        <div className="org-row__line">
                          <input type="checkbox" id={`sel-${row.rowId}`} checked={selected.includes(row.rowId)} disabled={!selectable}
                            onChange={e => setSelected(s => (e.target.checked ? [...s, row.rowId] : s.filter(x => x !== row.rowId)))}
                            aria-label={`${title} zum Veröffentlichen auswählen`} />
                          <span className="org-row__state" data-tone={STATE_TONE[row.state]}>{STATE_LABEL[row.state]}</span>
                          <div className="org-row__title">
                            <h3>{title}</h3>
                            <p className="muted">
                              {row.rowId}
                              {row.candidate ? ` · ${formatPrice(row.candidate)}` : ""}
                              {row.changedFields.length ? ` · geändert: ${row.changedFields.join(", ")}` : ""}
                            </p>
                          </div>
                          <button type="button" className="btn" aria-expanded={openRow === row.rowId}
                            onClick={() => setOpenRow(o => (o === row.rowId ? null : row.rowId))}>
                            {openRow === row.rowId ? "Zuklappen" : "Prüfen & korrigieren"}
                          </button>
                        </div>
                        {row.issues.length ? (
                          <ul className="org-row__issues">
                            {row.issues.map((issue, i) => <li key={i}><code>{issue.path}</code> {issue.message}</li>)}
                          </ul>
                        ) : null}
                        {openRow === row.rowId ? (
                          <RowEditor row={row} disabled={localOnly || busy !== null} busy={busy === `patch:${row.rowId}`}
                            onSave={changes => onPatch(row, changes)} />
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                <div className="org__publish panel">
                  <p>
                    <strong>{selected.length}</strong> von {readyIds.length} bereiten Zeilen ausgewählt.
                    {counts?.blocked ? ` ${counts.blocked} blockierte Zeilen können nicht veröffentlicht werden.` : ""}
                  </p>
                  <div className="row">
                    <button type="button" className="btn" disabled={localOnly || !readyIds.length}
                      onClick={() => setSelected(s => (s.length === readyIds.length ? [] : readyIds))}>
                      {selected.length === readyIds.length && readyIds.length ? "Auswahl leeren" : "Alle bereiten auswählen"}
                    </button>
                    <button type="button" className="btn btn--primary" disabled={localOnly || !selected.length || busy !== null} onClick={onApprove}>
                      {busy === "approve" ? "Wird veröffentlicht…" : `Ausgewählte veröffentlichen (${selected.length})`}
                    </button>
                  </div>
                  {localOnly ? <p className="muted">Veröffentlichen braucht den Review-Server; diese Beispiel-Session ist nur zum Ansehen.</p> : null}
                </div>
              </section>
            ) : !adminMissing ? (
              <div className="org__empty panel">
                <h3>Noch kein Import geladen.</h3>
                <p className="muted">Lade die CSV-Vorlage, fülle sie aus und lade sie hoch. Du bekommst eine Vorschau mit Status je Zeile, bevor irgendetwas veröffentlicht wird.</p>
              </div>
            ) : null}
          </>
        ) : (
          <SourcesPanel taxonomy={taxonomy} disabled={adminMissing || busy !== null}
            onScrape={pid => run("scrape", async () => {
              const r = await startScrapeRun(pid);
              setNotice(`Lauf ${r.runId} gestartet (${r.status}).`);
            })}
            onTaxonomy={setTaxonomy} notice={notice} error={error} onError={setError} onNotice={setNotice} />
        )}
      </main>
    </div>
  );
}

function RowEditor({ row, disabled, busy, onSave }: { row: ReviewRow; disabled: boolean; busy: boolean; onSave: (changes: ReviewFieldPatch) => void }) {
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
      <label className="dz-field org-edit__wide"><span>Titel (de)</span>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="dz-field"><span>Preis €</span>
        <input type="number" min="0" step="0.5" value={price} onChange={e => setPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="unbekannt" /></label>
      <label className="dz-field"><span>Alter ab</span>
        <input type="number" min="0" max="25" value={minAge} onChange={e => setMinAge(e.target.value === "" ? "" : Number(e.target.value))} placeholder="unbekannt" /></label>
      <label className="dz-field"><span>Alter bis</span>
        <input type="number" min="0" max="25" value={maxAge} onChange={e => setMaxAge(e.target.value === "" ? "" : Number(e.target.value))} placeholder="unbekannt" /></label>
      <label className="dz-field"><span>Datum</span>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
      <label className="dz-field"><span>Plätze</span>
        <select value={availability} onChange={e => setAvailability(e.target.value as Offer["availability"])}>
          {AVAILABILITIES.map(a => <option key={a} value={a}>{AVAIL_LABEL[a]}</option>)}
        </select></label>
      <div className="row org-edit__actions">
        <button type="button" className="btn btn--primary" onClick={save} disabled={disabled}>
          {busy ? "Wird geprüft…" : "Speichern & neu prüfen"}
        </button>
        {disabled && !busy ? <span className="muted">Braucht den Review-Server.</span> : <span className="muted">Der Server prüft die Zeile erneut; nichts wird dabei veröffentlicht.</span>}
      </div>
    </div>
  );
}

function SourcesPanel({ taxonomy, disabled, onScrape, onTaxonomy, notice, error, onError, onNotice }: {
  taxonomy: Taxonomy | null; disabled: boolean;
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
      if (err instanceof ServiceMissingError) onError("Konfiguration ändern braucht den lokalen Review-Server (INTEREST_ATLAS_LOCAL_DESK=1).");
      else onError(err instanceof AdminApiError ? err.message : "Unerwarteter Fehler.");
    }
    finally { setBusy(null); }
  };

  const saveSource = (change: ProviderChange) => act(`src:${change.id}`, async () => {
    const { provider, created, note } = await saveProvider(change);
    load(); setEditing(null); setAdding(null);
    return `${provider.name} ${created ? "angelegt" : "gespeichert"}.${note ? ` ${note}` : ""}`;
  });
  const saveTax = (change: TopicChange, what: string) => act(`tax:${change.kind}:${change.id}`, async () => {
    const next = await saveTopic(change);
    onTaxonomy(next); setAdding(null); setEditing(null);
    return `${what} gespeichert. Konfigurationsversion ${next.version}.`;
  });

  return (
    <section className="org__sources" aria-labelledby="org-sources-title">
      <div className="org__session-head">
        <h2 id="org-sources-title">Quellen</h2>
        <button type="button" className="btn" disabled={disabled} onClick={() => onScrape("all")}>Alle Quellen aktualisieren</button>
        <button type="button" className="btn" disabled={disabled} onClick={() => { setAdding(a => (a === "source" ? null : "source")); setEditing(null); }}>
          Quelle hinzufügen
        </button>
      </div>
      {error ? <p className="status-line" data-tone="bad" role="alert">{error}</p> : null}
      {notice ? <p className="status-line" data-tone="ok" role="status">{notice}</p> : null}
      {disabled ? <p className="muted">Quellen und Themen ändern braucht den Review-Server. Starte die App lokal mit <code>INTEREST_ATLAS_LOCAL_DESK=1</code>.</p> : null}

      {adding === "source" ? (
        <SourceForm busy={busy === "src:"} disabled={disabled}
          onCancel={() => setAdding(null)} onSave={saveSource} />
      ) : null}

      <div className="org__provider-grid">
        {(sources ?? []).map(p => (
          <article key={p.id} className={`panel org-provider${p.enabled ? "" : " is-off"}`}>
            <div className="org-provider__head">
              <h3>{p.name}</h3>
              <span className={p.enabled ? "tag tag--verified" : "tag tag--unknown"}>{p.enabled ? "aktiv" : "deaktiviert"}</span>
            </div>
            <p className="muted org-provider__meta">
              <code>{p.id}</code> · {p.adapter === "implemented" ? "Adapter vorhanden" : "nur CSV-Import"}
              {p.permissionStatus ? ` · Erlaubnis: ${p.permissionStatus}` : ""}
            </p>
            {p.discoveryUrl ? <a href={p.discoveryUrl} target="_blank" rel="noreferrer">Quellseite öffnen</a> : <p className="muted">Keine Quellseite hinterlegt.</p>}
            {editing === p.id ? (
              <SourceForm source={p} busy={busy === `src:${p.id}`} disabled={disabled}
                onCancel={() => setEditing(null)} onSave={saveSource} />
            ) : (
              <div className="row">
                <button type="button" className="btn" disabled={disabled} onClick={() => { setEditing(p.id); setAdding(null); }}>Bearbeiten</button>
                <button type="button" className="btn" disabled={disabled || busy !== null}
                  onClick={() => saveSource({ id: p.id, enabled: !p.enabled })}>
                  {p.enabled ? "Deaktivieren" : "Aktivieren"}
                </button>
                <button type="button" className="btn" disabled={disabled || p.adapter !== "implemented"} onClick={() => onScrape(p.id)}
                  title={p.adapter === "implemented" ? undefined : "Diese Quelle hat keinen Adapter; Daten kommen per CSV."}>
                  Aktualisieren
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      {sources && !sources.length ? <p className="muted">Noch keine Quelle konfiguriert.</p> : null}
      {!sources && !disabled ? <p className="muted">Quellen werden geladen…</p> : null}
      <p className="muted org__hint">
        Eine Quelle wird nie gelöscht, nur deaktiviert — so bleiben schon veröffentlichte Angebote gültig. Der erlaubte Host
        einer bestehenden Quelle lässt sich hier nicht ändern, weil das den Scraping-Bereich erweitern würde. Eine neue Quelle
        ist zunächst CSV-only: automatisches Aktualisieren braucht einen Adapter für die jeweilige Website.
      </p>

      <div className="org__session-head">
        <h2>Themen &amp; Interessen</h2>
        <button type="button" className="btn" disabled={disabled} onClick={() => { setAdding(a => (a === "topic" ? null : "topic")); setEditing(null); }}>Thema hinzufügen</button>
        <button type="button" className="btn" disabled={disabled || !taxonomy?.topics.length} onClick={() => { setAdding(a => (a === "interest" ? null : "interest")); setEditing(null); }}>Interesse hinzufügen</button>
      </div>
      {adding === "topic" ? <TaxonomyForm kind="topic" busy={busy !== null} disabled={disabled} onCancel={() => setAdding(null)} onSave={saveTax} /> : null}
      {adding === "interest" && taxonomy ? <TaxonomyForm kind="interest" topics={taxonomy.topics} busy={busy !== null} disabled={disabled} onCancel={() => setAdding(null)} onSave={saveTax} /> : null}
      {taxonomy ? (
        <div className="org__tax">
          <p className="muted">Konfigurationsversion {taxonomy.version}. Jede Änderung zählt sie hoch.</p>
          <TaxList kind="topic" entries={taxonomy.topics.map(t => ({ id: t.id, label: t.label, enabled: t.enabled }))}
            disabled={disabled} busy={busy} editing={editing} setEditing={setEditing} onSave={saveTax} />
          <TaxList kind="interest" entries={taxonomy.interests.map(i => ({ id: i.id, label: i.label, enabled: i.enabled, topicIds: i.topicIds }))}
            topics={taxonomy.topics} disabled={disabled} busy={busy} editing={editing} setEditing={setEditing} onSave={saveTax} />
        </div>
      ) : <p className="muted">Themen noch nicht geladen.</p>}
    </section>
  );
}

const KIND_LABEL = { topic: "Thema", interest: "Interesse" } as const;

interface TaxEntry { id: string; label: { de: string; en: string }; enabled: boolean; topicIds?: readonly string[] }

function TaxList({ kind, entries, topics, disabled, busy, editing, setEditing, onSave }: {
  kind: "topic" | "interest"; entries: TaxEntry[]; topics?: readonly { id: string; label: { de: string } }[];
  disabled: boolean; busy: string | null; editing: string | null;
  setEditing: (id: string | null) => void; onSave: (change: TopicChange, what: string) => void;
}) {
  return (
    <div className="org-tax-list">
      <h3>{kind === "topic" ? "Themen" : "Interessen"}</h3>
      {entries.map(e => (
        <div key={e.id} className={`org-tax-row${e.enabled ? "" : " is-off"}`}>
          <div className="org-tax-row__text">
            <strong>{e.label.de}</strong> <span className="muted">{e.label.en} · <code>{e.id}</code></span>
            {e.topicIds?.length && topics ? (
              <span className="muted"> · {e.topicIds.map(id => topics.find(t => t.id === id)?.label.de ?? id).join(", ")}</span>
            ) : null}
            {e.enabled ? null : <span className="tag tag--unknown">deaktiviert</span>}
          </div>
          <div className="row">
            <button type="button" className="btn" disabled={disabled} onClick={() => setEditing(editing === `${kind}:${e.id}` ? null : `${kind}:${e.id}`)}>Bearbeiten</button>
            <button type="button" className="btn" disabled={disabled || busy !== null}
              onClick={() => onSave({ kind, id: e.id, enabled: !e.enabled }, `${KIND_LABEL[kind]} „${e.label.de}" ${e.enabled ? "deaktiviert" : "aktiviert"}`)}>
              {e.enabled ? "Deaktivieren" : "Aktivieren"}
            </button>
          </div>
          {editing === `${kind}:${e.id}` ? (
            <TaxonomyForm kind={kind} entry={e} topics={topics as { id: string; label: { de: string } }[] | undefined}
              busy={busy !== null} disabled={disabled} onCancel={() => setEditing(null)} onSave={onSave} />
          ) : null}
        </div>
      ))}
      {!entries.length ? <p className="muted">Noch keine Einträge.</p> : null}
    </div>
  );
}

/** Add or edit one theme/interest. The ID of an existing entry is never editable. */
function TaxonomyForm({ kind, entry, topics, busy, disabled, onCancel, onSave }: {
  kind: "topic" | "interest"; entry?: TaxEntry; topics?: readonly { id: string; label: { de: string } }[];
  busy: boolean; disabled: boolean; onCancel: () => void; onSave: (change: TopicChange, what: string) => void;
}) {
  const [id, setId] = useState(entry?.id ?? "");
  const [de, setDe] = useState(entry?.label.de ?? "");
  const [en, setEn] = useState(entry?.label.en ?? "");
  const [picked, setPicked] = useState<string[]>([...(entry?.topicIds ?? [])]);
  const [local, setLocal] = useState<string | null>(null);

  const submit = () => {
    const trimmed = id.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed) || trimmed.length > 40) { setLocal("Die ID braucht Kleinbuchstaben, Zahlen und Bindestriche, höchstens 40 Zeichen."); return; }
    if (!de.trim() || !en.trim()) { setLocal("Beide Bezeichnungen (de und en) sind nötig."); return; }
    if (kind === "interest" && !picked.length) { setLocal("Wähle mindestens ein Thema."); return; }
    setLocal(null);
    const change: TopicChange = { kind, id: trimmed, label: { de: de.trim(), en: en.trim() } };
    if (kind === "interest") change.topicIds = picked;
    onSave(change, `${KIND_LABEL[kind]} „${de.trim()}"`);
  };

  return (
    <div className="org-edit">
      <label className="dz-field"><span>ID</span>
        <input type="text" value={id} disabled={!!entry} onChange={e => setId(e.target.value)} placeholder="z-b-robotik" /></label>
      <label className="dz-field"><span>Bezeichnung (de)</span>
        <input type="text" value={de} onChange={e => setDe(e.target.value)} /></label>
      <label className="dz-field"><span>Bezeichnung (en)</span>
        <input type="text" value={en} onChange={e => setEn(e.target.value)} /></label>
      {kind === "interest" && topics ? (
        <fieldset className="org-edit__wide org-edit__fieldset">
          <legend>Themen</legend>
          {topics.map(t => (
            <label key={t.id} className="dz-check">
              <input type="checkbox" checked={picked.includes(t.id)}
                onChange={e => setPicked(p => (e.target.checked ? [...p, t.id] : p.filter(x => x !== t.id)))} />
              {t.label.de}
            </label>
          ))}
        </fieldset>
      ) : null}
      {local ? <p className="status-line org-edit__wide" data-tone="bad" role="alert">{local}</p> : null}
      <div className="row org-edit__actions">
        <button type="button" className="btn btn--primary" disabled={disabled || busy} onClick={submit}>{busy ? "Wird gespeichert…" : "Speichern"}</button>
        <button type="button" className="btn" onClick={onCancel}>Abbrechen</button>
        {entry ? <span className="muted">Die ID bleibt, damit veröffentlichte Angebote weiter gültig sind.</span> : null}
      </div>
    </div>
  );
}

/** Add or edit one source. An existing source keeps its ID and its allowed hosts. */
function SourceForm({ source, busy, disabled, onCancel, onSave }: {
  source?: AdminProviderView; busy: boolean; disabled: boolean;
  onCancel: () => void; onSave: (change: ProviderChange) => void;
}) {
  const [id, setId] = useState(source?.id ?? "");
  const [name, setName] = useState(source?.name ?? "");
  const [url, setUrl] = useState(source?.discoveryUrl ?? "");
  const [local, setLocal] = useState<string | null>(null);

  const submit = () => {
    const trimmed = id.trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed) || trimmed.length > 40) { setLocal("Die ID braucht Kleinbuchstaben, Zahlen und Bindestriche, höchstens 40 Zeichen."); return; }
    if (!name.trim() || name.length > 120) { setLocal("Der Name muss 1 bis 120 Zeichen lang sein."); return; }
    let parsed: URL;
    try { parsed = new URL(url.trim()); } catch { setLocal("Die Quellseite muss ein vollständiger https://-Link sein."); return; }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) { setLocal("Nur ein einfacher https://-Link ohne Port und Anmeldedaten."); return; }
    if (source?.allowedHosts.length && !source.allowedHosts.includes(parsed.hostname)) {
      setLocal(`Der Link muss auf ${source.allowedHosts.join(" oder ")} bleiben.`); return;
    }
    setLocal(null);
    onSave({ id: trimmed, name: name.trim(), discoveryUrl: parsed.toString() });
  };

  return (
    <div className="org-edit panel">
      <label className="dz-field"><span>ID</span>
        <input type="text" value={id} disabled={!!source} onChange={e => setId(e.target.value)} placeholder="z-b-stadtbibliothek" /></label>
      <label className="dz-field org-edit__wide"><span>Name</span>
        <input type="text" value={name} onChange={e => setName(e.target.value)} /></label>
      <label className="dz-field org-edit__wide"><span>Quellseite (https://)</span>
        <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" /></label>
      {local ? <p className="status-line org-edit__wide" data-tone="bad" role="alert">{local}</p> : null}
      <div className="row org-edit__actions">
        <button type="button" className="btn btn--primary" disabled={disabled || busy} onClick={submit}>{busy ? "Wird gespeichert…" : "Speichern"}</button>
        <button type="button" className="btn" onClick={onCancel}>Abbrechen</button>
        <span className="muted">
          {source
            ? `Erlaubte Hosts bleiben: ${source.allowedHosts.join(", ") || "keine hinterlegt"}.`
            : "Eine neue Quelle ist CSV-only; der Host wird aus dem Link übernommen."}
        </span>
      </div>
    </div>
  );
}
