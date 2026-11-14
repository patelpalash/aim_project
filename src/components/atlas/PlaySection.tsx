"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Interest, Taxonomy } from "@/shared/contracts";
import { pick } from "@/shared/i18n";
import { QUIZ_QUESTIONS, getQuizSuggestions } from "@/shared/quiz";
import { PUZZLES, evaluateSequencePuzzle, type PuzzleResult, type SequenceCommand, type SequencePuzzle } from "@/shared/puzzles";
import { interestMeta, InterestIcon } from "./interests";
import { useLocale } from "../i18n";
import "./play.css";

/**
 * I4: optional play routes into discovery — the three-question preference quiz and the
 * robot-path sequence puzzle, both over Palash's shared evaluators. Browsing never requires them.
 */
export interface PlaySectionProps {
  taxonomy: Taxonomy | null;
  quizAnswers: Readonly<Record<string, string>>;
  completedPuzzleIds: readonly string[];
  selectedInterests: readonly Interest[];
  onAnswer: (questionId: string, choiceId: string | null) => void;
  onPuzzleDone: (id: string) => void;
  onResetPlay: () => void;
  /** Turn suggested interests on and jump to the results. */
  onApplyInterests: (ids: Interest[]) => void;
}

export function PlaySection({ taxonomy, quizAnswers, completedPuzzleIds, selectedInterests, onAnswer, onPuzzleDone, onResetPlay, onApplyInterests }: PlaySectionProps) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState<"quiz" | "puzzle" | null>(null);
  /** Bumping this remounts quiz and puzzle, so a reset really clears the board and the step. */
  const [round, setRound] = useState(0);
  const solved = completedPuzzleIds.includes("sequence-path");
  const puzzle = PUZZLES.find(p => p.kind === "sequence") as SequencePuzzle | undefined;
  const started = open !== null || Object.keys(quizAnswers).length > 0 || solved;

  const resetPlay = () => {
    onResetPlay();
    setOpen(null);
    setRound(r => r + 1);
  };

  return (
    <section className="wrap play" aria-labelledby="play-title">
      <div className="dz-board__head reveal">
        <h2 id="play-title">{t("play.title")}</h2>
        <p className="muted">{t("play.lede")}</p>
        {started ? (
          <button type="button" className="btn play__reset" onClick={resetPlay}>{t("play.reset")}</button>
        ) : null}
      </div>
      <p className="visually-hidden" role="status" aria-live="polite">{round ? t("play.resetSaid") : ""}</p>
      <div className="play__grid">
        <article className={`panel play-card reveal${open === "quiz" ? " is-open" : ""}`} style={{ "--d": 0 } as CSSProperties}>
          <header className="play-card__head">
            <span className="play-card__orb" aria-hidden="true" style={{ "--a": "var(--i-tell-stories-a)", "--b": "var(--i-tell-stories-b)" } as CSSProperties}>
              <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 12a4 4 0 1 1 6 3.4c-1.4.8-2 1.6-2 3.1" /><circle cx="16" cy="23.5" r="0.5" fill="currentColor" /><circle cx="16" cy="16" r="13" /></svg>
            </span>
            <div>
              <h3>{t("play.quizTitle")}</h3>
              <p className="muted">{t("play.quizLede")}</p>
            </div>
            <button type="button" className="btn" aria-expanded={open === "quiz"} onClick={() => setOpen(o => (o === "quiz" ? null : "quiz"))}>
              {open === "quiz" ? t("play.close") : Object.keys(quizAnswers).length ? t("play.continue") : t("play.start")}
            </button>
          </header>
          {open === "quiz" ? <Quiz key={`quiz-${round}`} taxonomy={taxonomy} answers={quizAnswers} onAnswer={onAnswer} onApply={onApplyInterests} /> : null}
        </article>

        <article className={`panel play-card reveal${open === "puzzle" ? " is-open" : ""}`} style={{ "--d": 1 } as CSSProperties}>
          <header className="play-card__head">
            <span className="play-card__orb" aria-hidden="true" style={{ "--a": "var(--i-robots-a)", "--b": "var(--i-robots-b)" } as CSSProperties}>
              <InterestIcon interest="robots" size={26} />
            </span>
            <div>
              <h3>{puzzle ? pick(puzzle.title, locale) : t("play.puzzleFallback")}</h3>
              <p className="muted">{t("play.puzzleLede")}{solved ? t("play.puzzleSolved") : ""}</p>
            </div>
            <button type="button" className="btn" aria-expanded={open === "puzzle"} onClick={() => setOpen(o => (o === "puzzle" ? null : "puzzle"))}>
              {open === "puzzle" ? t("play.close") : t("play.puzzlePlay")}
            </button>
          </header>
          {open === "puzzle" && puzzle ? (
            <PathPuzzle key={`pz-${round}`} puzzle={puzzle} selectedInterests={selectedInterests}
              onDone={onPuzzleDone} onApply={onApplyInterests} />
          ) : null}
        </article>
      </div>
    </section>
  );
}

const COMMANDS: readonly SequenceCommand[] = ["forward", "left", "right"];
const CMD_GLYPH: Record<SequenceCommand, string> = { forward: "↑", left: "⟲", right: "⟳" };
const ROT: Record<string, number> = { north: 0, east: 90, south: 180, west: 270 };

function Quiz({ taxonomy, answers, onAnswer, onApply }: {
  taxonomy: Taxonomy | null;
  answers: Readonly<Record<string, string>>;
  onAnswer: (questionId: string, choiceId: string | null) => void;
  onApply: (ids: Interest[]) => void;
}) {
  const { locale, t } = useLocale();
  const firstOpen = QUIZ_QUESTIONS.findIndex(q => !(q.id in answers));
  const [step, setStep] = useState(firstOpen === -1 ? QUIZ_QUESTIONS.length : firstOpen);
  const done = step >= QUIZ_QUESTIONS.length;
  const restart = () => { QUIZ_QUESTIONS.forEach(q => { if (q.id in answers) onAnswer(q.id, null); }); setStep(0); };
  const suggestions = useMemo(() => {
    try { return getQuizSuggestions(answers, taxonomy ?? undefined); } catch { return null; }
  }, [answers, taxonomy]);
  if (done) {
    return (
      <div className="quiz m-cascade">
        <p style={{ "--n": 0 } as CSSProperties}>
          {suggestions?.answeredCount
            ? suggestions.interests.length
              ? t("quiz.fits")
              : t("quiz.noneFit")
            : t("quiz.allSkipped")}
        </p>
        {suggestions?.interests.length ? (
          <>
            <div className="row" style={{ "--n": 1 } as CSSProperties}>
              {suggestions.interests.map(s => {
                const meta = interestMeta(s.id, pick(s.label, locale), t);
                return (
                  <span key={s.id} className="quiz__chip" style={{ "--a": meta.a, "--b": meta.b } as CSSProperties}>
                    <InterestIcon interest={s.id} size={18} />{meta.label}
                  </span>
                );
              })}
            </div>
            <div className="row" style={{ "--n": 2 } as CSSProperties}>
              <button type="button" className="btn btn--primary" onClick={() => onApply(suggestions.interestIds)}>{t("quiz.apply")}</button>
              <button type="button" className="btn" onClick={() => setStep(QUIZ_QUESTIONS.length - 1)}>{t("quiz.change")}</button>
              <button type="button" className="btn" onClick={restart}>{t("quiz.restart")}</button>
            </div>
          </>
        ) : (
          <div className="row" style={{ "--n": 1 } as CSSProperties}>
            <button type="button" className="btn" onClick={() => setStep(QUIZ_QUESTIONS.length - 1)}>{t("quiz.change")}</button>
            <button type="button" className="btn" onClick={restart}>{t("quiz.restart")}</button>
          </div>
        )}
      </div>
    );
  }
  const q = QUIZ_QUESTIONS[step]!;
  const answered = q.id in answers;
  return (
    <div className="quiz" key={q.id}>
      <p className="quiz__progress">{t("quiz.progress", { step: step + 1, total: QUIZ_QUESTIONS.length })}{answered ? t("quiz.answered") : ""}</p>
      <h4 className="quiz__q m-up" style={{ "--d": 0 } as CSSProperties}>{pick(q.label, locale)}</h4>
      <div className="quiz__choices">
        {q.choices.map((c, n) => (
          <button key={c.id} type="button" className="quiz__choice m-up" style={{ "--d": n + 1 } as CSSProperties}
            aria-pressed={answers[q.id] === c.id}
            onClick={() => { onAnswer(q.id, c.id); setStep(s => s + 1); }}>
            {pick(c.label, locale)}
          </button>
        ))}
      </div>
      <div className="row quiz__nav">
        <button type="button" className="btn" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>{t("quiz.back")}</button>
        {answered ? (
          <>
            <button type="button" className="btn" onClick={() => onAnswer(q.id, null)}>{t("quiz.clear")}</button>
            <button type="button" className="btn" onClick={() => setStep(s => s + 1)}>{t("quiz.next")}</button>
          </>
        ) : (
          <button type="button" className="dz-link quiz__skip" onClick={() => setStep(s => s + 1)}>{t("quiz.skip")}</button>
        )}
      </div>
    </div>
  );
}

function PathPuzzle({ puzzle, selectedInterests, onDone, onApply }: {
  puzzle: SequencePuzzle;
  selectedInterests: readonly Interest[];
  onDone: (id: string) => void;
  onApply: (ids: Interest[]) => void;
}) {
  const { locale, t } = useLocale();
  const [commands, setCommands] = useState<(SequenceCommand | null)[]>([...puzzle.initialCommands]);
  const [result, setResult] = useState<PuzzleResult | null>(null);
  const [bot, setBot] = useState({ ...puzzle.start, step: 0 });
  const [running, setRunning] = useState(false);
  const [shake, setShake] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const editable = puzzle.initialCommands.map(c => c === null);

  const run = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    const res = evaluateSequencePuzzle(puzzle.id, commands);
    setResult(null);
    setBot({ ...puzzle.start, step: 0 });
    if (!res.trace || res.trace.length <= 1) { setResult(res); if (res.status === "try-again") setShake(s => s + 1); return; }
    setRunning(true);
    res.trace.forEach((t, i) => {
      timers.current.push(setTimeout(() => {
        setBot({ x: t.x, y: t.y, heading: t.heading, step: t.step });
        if (i === res.trace!.length - 1) {
          setRunning(false); setResult(res);
          if (res.status === "correct") onDone(puzzle.id);
          else if (res.status === "try-again") setShake(s => s + 1);
        }
      }, i * 380));
    });
  };
  const reset = () => { timers.current.forEach(clearTimeout); timers.current = []; setRunning(false); setCommands([...puzzle.initialCommands]); setResult(null); setBot({ ...puzzle.start, step: 0 }); };
  const fillNext = (cmd: SequenceCommand) => {
    setCommands(cs => { const i = cs.findIndex((c, n) => c === null && editable[n]); if (i === -1) return cs; const next = [...cs]; next[i] = cmd; return next; });
    setResult(null);
  };
  const clearSlot = (i: number) => { if (!editable[i]) return; setCommands(cs => { const next = [...cs]; next[i] = null; return next; }); setResult(null); };
  const newInterests = result?.status === "correct" ? result.suggestedInterests.filter(i => !selectedInterests.includes(i)) : [];

  return (
    <div className="pz" key={shake ? `s${shake}` : "pz"}>
      <p className="muted">{pick(puzzle.instructions, locale)}</p>
      <div className="pz__board-wrap">
        <div className={`pz__board${result?.status === "try-again" ? " m-wobble" : ""}`}
          style={{ "--w": puzzle.width, "--h": puzzle.height } as CSSProperties} role="img"
          aria-label={t("pz.board", { w: puzzle.width, h: puzzle.height, gx: puzzle.goal.x + 1, gy: puzzle.goal.y + 1 })}>
          {Array.from({ length: puzzle.width * puzzle.height }, (_, n) => {
            const cx = n % puzzle.width, cy = Math.floor(n / puzzle.width);
            const blocked = puzzle.blocked.some(c => c.x === cx && c.y === cy);
            const goal = puzzle.goal.x === cx && puzzle.goal.y === cy;
            return <span key={n} className={`pz__cell${blocked ? " is-blocked" : ""}${goal ? " is-goal" : ""}`}>{goal ? "★" : blocked ? "▦" : ""}</span>;
          })}
          <span className={`pz__bot${result?.status === "correct" ? " is-happy" : ""}`}
            style={{ "--x": bot.x, "--y": bot.y, "--r": `${ROT[bot.heading]}deg` } as CSSProperties} aria-hidden="true">
            <InterestIcon interest="robots" size={26} />
            <i className="pz__nose" />
          </span>
        </div>
      </div>
      <div className="pz__slots" aria-label={t("pz.commands")}>
        {commands.map((c, i) => (
          <button key={i} type="button" className={`pz__slot${c ? "" : " is-empty"}${editable[i] ? "" : " is-fixed"}${bot.step === i + 1 && running ? " is-now" : ""}`}
            disabled={!editable[i] || running} onClick={() => clearSlot(i)}
            aria-label={`${t("pz.slot", { n: i + 1, cmd: c ? t(`cmd.${c}`) : t("pz.slotEmpty") })}${editable[i] && c ? t("pz.slotRemove") : ""}`}>
            {c ? CMD_GLYPH[c] : "?"}
          </button>
        ))}
      </div>
      <div className="row">
        {COMMANDS.map(cmd => (
          <button key={cmd} type="button" className="chip" disabled={running || !commands.some((c, n) => c === null && editable[n])} onClick={() => fillNext(cmd)}>
            {CMD_GLYPH[cmd]} {t(`cmd.${cmd}`)}
          </button>
        ))}
      </div>
      <div className="row">
        <button type="button" className="btn btn--primary" onClick={run} disabled={running}>{t(running ? "pz.running" : "pz.run")}</button>
        <button type="button" className="btn" onClick={reset} disabled={running}>{t("pz.reset")}</button>
      </div>
      {result ? (
        <div className={`pz__msg status-line${result.status === "correct" ? "" : ""}`} data-tone={result.status === "correct" ? "ok" : result.status === "try-again" ? "warn" : "bad"} role="status">
          {pick(result.message, locale)}
        </div>
      ) : null}
      {result?.status === "correct" && newInterests.length ? (
        <div className="row m-up" style={{ "--d": 0 } as CSSProperties}>
          <span className="muted">{t("pz.fits")}</span>
          <button type="button" className="btn" onClick={() => onApply(newInterests)}>
            {t("pz.view", { list: newInterests.map(i => interestMeta(i, undefined, t).label).join(" + ") })}
          </button>
        </div>
      ) : null}
    </div>
  );
}
