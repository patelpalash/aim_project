"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Offer, Taxonomy } from "@/shared/contracts";
import type { ProviderSummary } from "@/shared/api-contract";
import { countReviewRows, validateReviewSession, type ReviewFieldPatch, type ReviewRow, type ReviewSession } from "@/shared/review";
import { validateTaxonomy } from "@/shared/taxonomy";
import { formatPrice } from "../atlas/format";
import { AdminApiError, ServiceMissingError, approveRows, fetchProviders, fetchSession, fetchTaxonomy, patchRow, startScrapeRun, uploadCsv, type ApproveResult } from "./api";
import "./organizer.css";

const STATE_LABEL: Record<ReviewRow["state"], string> = {
  "ready-new": "Bereit (neu)", "ready-update": "Bereit (Update)", "needs-review": "Prüfen", blocked: "Blockiert", unchanged: "Unverändert"
};
const STATE_TONE: Record<ReviewRow["state"], string> = { "ready-new": "ok", "ready-update": "ok", "needs-review": "warn", blocked: "bad", unchanged: "muted" };
const AVAILABILITIES = ["available", "full", "cancelled", "unknown"] as const;
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
  }, []);

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
    setApproveResult(result);
    setNotice(null);
    const next = await fetchSession(session.importId, taxonomy ?? undefined).catch(() => null);
    if (next) adoptSession(next, false);
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

      <main className="wrap org__main">
        {publicApiMissing ? <p className="status-line" data-tone="warn">Konfigurations-API fehlt noch; Anbieter und Themen kommen aus den Repo-Fixtures.</p> : null}
        {adminMissing ? (
          <div className="panel org__missing">
            <h2>Der Review-Server ist noch nicht da.</h2>
            <p className="muted">Upload, Korrektur und Veröffentlichen laufen über die /api/admin-Routen (Umangs Aufgabe U4/U5), die noch 404 liefern. Sobald sie da sind, funktioniert diese Seite ohne Änderung.</p>
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
          <SourcesPanel providers={providers} taxonomy={taxonomy} disabled={adminMissing || busy !== null}
            onScrape={pid => run("scrape", async () => {
              const r = await startScrapeRun(pid);
              setNotice(`Lauf ${r.runId} gestartet (${r.status}).`);
            })} notice={notice} error={error} />
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

function SourcesPanel({ providers, taxonomy, disabled, onScrape, notice, error }: {
  providers: ProviderSummary[]; taxonomy: Taxonomy | null; disabled: boolean;
  onScrape: (providerId: string | "all") => void; notice: string | null; error: string | null;
}) {
  return (
    <section className="org__sources" aria-labelledby="org-sources-title">
      <div className="org__session-head">
        <h2 id="org-sources-title">Quellen</h2>
        <button type="button" className="btn" disabled={disabled} onClick={() => onScrape("all")}>Alle Quellen aktualisieren</button>
      </div>
      {error ? <p className="status-line" data-tone="bad" role="alert">{error}</p> : null}
      {notice ? <p className="status-line" data-tone="ok" role="status">{notice}</p> : null}
      {disabled ? <p className="muted">Quellen-Läufe brauchen den Review-Server (U-Aufgaben).</p> : null}
      <div className="org__provider-grid">
        {providers.map(p => (
          <article key={p.id} className="panel org-provider">
            <h3>{p.name}</h3>
            {p.discoveryUrl ? <a href={p.discoveryUrl} target="_blank" rel="noreferrer">Quellseite öffnen</a> : <p className="muted">Keine Quellseite hinterlegt.</p>}
            <button type="button" className="btn" disabled={disabled} onClick={() => onScrape(p.id)}>Aktualisieren</button>
          </article>
        ))}
      </div>
      <h2>Themen & Interessen</h2>
      {taxonomy ? (
        <div className="org__tax">
          <div className="row">{taxonomy.topics.map(t => <span key={t.id} className={`tag${t.enabled ? "" : " tag--unknown"}`}>{t.label.de}{t.enabled ? "" : " (aus)"}</span>)}</div>
          <div className="row">{taxonomy.interests.map(i => <span key={i.id} className={`tag${i.enabled ? "" : " tag--unknown"}`}>{i.label.de}{i.enabled ? "" : " (aus)"}</span>)}</div>
          <p className="muted">Aktivieren/Deaktivieren liegt in der Konfiguration (Umang); diese Ansicht zeigt den Stand.</p>
        </div>
      ) : <p className="muted">Themen noch nicht geladen.</p>}
    </section>
  );
}
