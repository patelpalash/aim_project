"use client";

import { useRef, useState, type CSSProperties } from "react";
import { ArrowBendUpLeft, ArrowBendUpRight, ArrowCounterClockwise, ArrowRight, ArrowUp, Buildings, Circle, Cube, Drop, FlagCheckered, House, Lightbulb, Mountains, Play, Repeat, Robot, RocketLaunch, SolarPanel, Square, Stop, Tree, Triangle, X } from "@phosphor-icons/react";
import { useLocale } from "../i18n";
import { bridgeStock, canPlaceBrick, checkBridge, checkCity, checkSorting, cityPlots, routeBoard, runRoute, specimens, type Brick, type CityTile, type Command, type Pose, type RunResult } from "./challenge";
import { useGamePlayback, useMovingPieces } from "./use-game-motion";

type GameProps = { harder: boolean; onSolve: () => void; onEdit: () => void };
function useWords() {
  const { locale } = useLocale();
  return (de: string, en: string) => locale === "de" ? de : en;
}
function GameHint({ children }: { children: React.ReactNode }) {
  const say = useWords();
  return <details className="game-hint"><summary><Lightbulb size={17} />{say("Ein kleiner Tipp", "A little hint")}</summary><p>{children}</p></details>;
}
function Reset({ onClick }: { onClick: () => void }) {
  const say = useWords();
  return <button type="button" className="btn icon-btn" onClick={onClick} aria-label={say("Spiel zurücksetzen", "Reset game")}><ArrowCounterClockwise size={19} /></button>;
}

export function RouteGame({ harder, onSolve, onEdit, coding }: GameProps & { coding: boolean }) {
  const say = useWords();
  const board = routeBoard(harder, coding);
  const [commands, setCommands] = useState<Command[]>([]);
  const [pose, setPose] = useState<Pose>(board.start);
  const [trace, setTrace] = useState<Pose[]>([]);
  const [active, setActive] = useState(-1);
  const [rotation, setRotation] = useState(board.start.direction * 90);
  const [result, setResult] = useState<RunResult | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const playback = useGamePlayback();
  const running = playback.running;
  const labels = { forward: say("Vorwärts", "Forward"), left: say("Links", "Left"), right: say("Rechts", "Right"), repeat: say("2× vorwärts", "2× forward") };
  const icons = { forward: ArrowUp, left: ArrowBendUpLeft, right: ArrowBendUpRight, repeat: Repeat };
  const directions = [say("Norden", "north"), say("Osten", "east"), say("Süden", "south"), say("Westen", "west")];
  const message = result ? {
    goal: say("Ziel erreicht! Dein Programm funktioniert.", "You reached the flag! Your programme works."),
    edge: say("Am Rand gelandet. Ändere deine Befehle und versuche es noch einmal.", "Oops, the edge! Change your commands and try again."),
    rock: say("Ein Felsen versperrt den Weg. Finde eine andere Route.", "A rock blocks the way. Try a different route."),
    short: say("Noch nicht am Ziel. Ergänze oder ändere deine Befehle.", "Not at the flag yet. Add or change your commands."),
    loop: say("Das Ziel stimmt! Nutze jetzt auch einen 2×-Block.", "You found the flag! Now include a 2× loop block."),
    limit: say("Zu viele Befehle. Nutze die Schleife.", "Too many commands. Try a loop."),
  }[result.reason] : "";
  const rewind = () => { playback.cancel(); setTrace([]); setPose(board.start); setRotation(board.start.direction * 90); setActive(-1); setResult(null); onEdit(); };
  const reset = () => { rewind(); setCommands([]); };
  const run = () => {
    if (running) return;
    const outcome = runRoute(board, commands);
    rewind();
    stageRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
    let angle = board.start.direction * 90;
    const rotations = outcome.trace.map((next, index) => {
      const before = outcome.trace[index - 1];
      if (before) { const delta = (next.direction - before.direction + 4) % 4; angle += delta === 3 ? -90 : delta * 90; }
      return angle;
    });
    playback.play(outcome.trace.length, 340, index => {
      setPose(outcome.trace[index]); setRotation(rotations[index]); setTrace(outcome.trace.slice(0, index + 1)); setActive(outcome.commandIndices[index]);
    }, () => { setActive(-1); setResult(outcome); if (outcome.solved) onSolve(); });
  };
  const Character = coding ? RocketLaunch : Robot;
  return <div className="hands-on-game">
    <p className="game-instruction">{coding ? say("Programmiere den Weg zur Flagge. Nutze eine 2×-Schleife und höchstens", "Code a route to the flag. Use a 2× loop and at most") : say("Baue einen Weg aus Befehlen. Der Roboter soll zur Flagge, ohne Felsen zu berühren. Höchstens", "Build a path with commands. Get the robot to the flag without hitting rocks. At most")} <strong>{board.limit} {say("Blöcke.", "blocks.")}</strong></p>
    <div ref={stageRef} className={`route-stage${running ? " is-running" : ""}${result?.solved ? " is-complete" : result ? " has-error" : ""}`}>
      <div className="route-board" style={{ "--size": board.size } as CSSProperties} role="img" aria-label={say(`Spielfeld ${board.size} mal ${board.size}. Start unten links, Ziel oben rechts. Felsen: ${board.rocks.map(i => `${i % board.size + 1}/${Math.floor(i / board.size) + 1}`).join(", ")}.`, `${board.size} by ${board.size} board. Start bottom left, goal top right. Rocks at column/row: ${board.rocks.map(i => `${i % board.size + 1}/${Math.floor(i / board.size) + 1}`).join(", ")}.`)}>
        {Array.from({ length: board.size ** 2 }, (_, i) => <div key={i} className={`route-cell${board.rocks.includes(i) ? " rock" : ""}${trace.some(p => p.y * board.size + p.x === i) ? " visited" : ""}`}>
          {board.rocks.includes(i) ? <Mountains size={27} weight="fill" /> : i === board.goal[1] * board.size + board.goal[0] ? <FlagCheckered size={28} weight="fill" /> : null}
        </div>)}
        <div className="route-character" style={{ transform: `translate(${pose.x * 100}%, ${pose.y * 100}%)` }}><span className="route-driver" style={{ transform: `rotate(${rotation}deg)` }}><Character size={31} weight="duotone" /><ArrowUp className="route-facing" size={15} weight="bold" /></span></div>
      </div>
      <p className="game-caption" aria-live="off">{say("Blick nach", "Facing")} <strong>{directions[pose.direction]}</strong> · {say("Spalte", "Column")} {pose.x + 1}, {say("Zeile", "row")} {pose.y + 1}</p>
    </div>
    <div className="command-palette" aria-label={say("Befehle hinzufügen", "Add commands")}>{(coding ? ["forward", "left", "right", "repeat"] : ["forward", "left", "right"]).map(c => {
      const command = c as Command; const Icon = icons[command];
      return <button key={command} type="button" disabled={running || commands.length >= board.limit} onClick={() => { rewind(); setCommands(cs => [...cs, command]); }}><Icon size={20} />{labels[command]}<span>+</span></button>;
    })}</div>
    <div className="program-tray"><div className="game-tray-label"><span>{say("DEIN PROGRAMM", "YOUR PROGRAMME")}</span><span>{commands.length}/{board.limit}</span></div>
      <ol className="program-blocks">{commands.length ? commands.map((c, i) => { const Icon = icons[c]; return <li key={i}><button type="button" disabled={running} aria-current={active === i ? "step" : undefined} aria-label={say(`Befehl ${i + 1} entfernen: ${labels[c]}`, `Remove command ${i + 1}: ${labels[c]}`)} onClick={() => { rewind(); setCommands(cs => cs.filter((_, j) => j !== i)); }}><small>{i + 1}</small><Icon size={18} />{c === "repeat" ? "2×" : null}<X size={12} /></button></li>; }) : <li className="tray-empty">{say("Tippe oben auf die Befehle. Antippen im Programm entfernt sie.", "Tap commands above to add them. Tap a block here to remove it.")}</li>}</ol>
    </div>
    <div className="game-controls"><button type="button" className="btn btn--primary" disabled={!commands.length} onClick={running ? rewind : run}>{running ? <Stop size={18} weight="fill" /> : <Play size={18} weight="fill" />}{running ? say("Anhalten", "Stop run") : say("Programm starten", "Run programme")}</button><Reset onClick={reset} /></div>
    <p className={`game-result${result?.solved ? " won" : ""}`} role="status">{running ? say("Deine Befehle werden ausgeführt…", "Running your commands…") : message}</p>
    <GameHint>{harder ? say("Erst nach rechts drehen. Fahre am unteren Rand nach rechts, dann am rechten Rand nach oben.", "Turn right first. Travel along the bottom edge, then up the right edge.") : say("Fahre zuerst am unteren Rand nach rechts. Drehe dann nach links und fahre nach oben. 2× bedeutet zweimal vorwärts.", "Travel right along the bottom edge. Turn left, then go up. 2× means forward twice.")}</GameHint>
  </div>;
}

export function BridgeGame({ harder, onSolve, onEdit }: GameProps) {
  const say = useWords();
  const [bricks, setBricks] = useState<Brick[]>([]);
  const [selected, setSelected] = useState(2);
  const [message, setMessage] = useState("");
  const [won, setWon] = useState(false);
  const [testing, setTesting] = useState(false);
  const [preview, setPreview] = useState<{ row: number; start: number } | null>(null);
  const playback = useGamePlayback();
  const width = harder ? 8 : 6;
  const stock = bridgeStock(harder);
  const place = (row: number, start: number) => {
    const brick = { row, start, length: selected };
    if (!canPlaceBrick(bricks, brick, width, stock)) { setMessage(say("Hier passt dieser Stein nicht. Wähle einen freien Platz oder einen anderen Stein.", "This brick does not fit here. Try another space or brick.")); return; }
    const next = [...bricks, brick];
    onEdit(); setBricks(next); setMessage(""); setWon(false); setTesting(false); setPreview(null);
    if (next.filter(b => b.length === selected).length === stock.filter(n => n === selected).length) {
      setSelected([2, 4].find(length => next.filter(b => b.length === length).length < stock.filter(n => n === length).length) ?? selected);
    }
  };
  return <div className="hands-on-game">
    <p className="game-instruction">{say("Baue eine Brücke aus zwei vollen Steinreihen. Die Fugen dürfen nicht direkt übereinander liegen. Wähle einen Stein, dann sein Startfeld.", "Build a bridge with two complete rows of bricks. Joints must not line up vertically. Pick a brick, then its starting space.")}</p>
    <div className={`bridge-stage${won ? " bridge-won" : ""}${testing ? " bridge-testing" : ""}${message && !won && !testing ? " has-error" : ""}`} onPointerLeave={() => setPreview(null)}>
      <div className="bridge-crossing" aria-hidden="true"><Robot size={28} weight="duotone" /><FlagCheckered size={26} weight="fill" /></div>
      <div className="brick-board" style={{ "--columns": width } as CSSProperties} role="group" aria-label={say("Brücke: zwei Reihen", "Bridge: two rows")}>
        {[0, 1].flatMap(row => Array.from({ length: width }, (_, col) => {
          const brick = bricks.find(b => b.row === row && b.start <= col && col < b.start + b.length);
          if (brick && brick.start !== col) return null;
          const highlighted = !brick && preview?.row === row && col >= preview.start && col < preview.start + selected;
          return <button key={`${row}-${col}`} type="button" disabled={playback.running} className={brick ? `placed-brick brick-${brick.length}` : `brick-slot${highlighted ? " is-preview" : ""}`} onPointerEnter={() => setPreview({ row, start: col })} onFocus={() => setPreview({ row, start: col })} onBlur={() => setPreview(null)} style={{ gridColumn: `${col + 1} / span ${brick?.length ?? 1}`, gridRow: row + 1 }} aria-label={brick ? say(`Stein entfernen: Reihe ${row + 1}, Feld ${col + 1}, Länge ${brick.length}`, `Remove brick: row ${row + 1}, space ${col + 1}, length ${brick.length}`) : say(`Stein setzen: Reihe ${row + 1}, Feld ${col + 1}`, `Place brick: row ${row + 1}, space ${col + 1}`)} onClick={() => { if (brick) { onEdit(); setBricks(bs => bs.filter(b => b !== brick)); setSelected(brick.length); setWon(false); setTesting(false); setMessage(""); } else place(row, col); }}>
            {brick ? <><span className="brick-studs" aria-hidden="true">{Array.from({ length: brick.length }, (_, i) => <i key={i} />)}</span><span>{brick.length}<X size={12} /></span></> : <span>{col + 1}</span>}
          </button>;
        }))}
      </div>
      <div className="bridge-river" aria-hidden="true">≈ &nbsp; ≈ &nbsp; ≈ &nbsp; ≈ &nbsp; ≈</div>
    </div>
    <div className="brick-palette" role="group" aria-label={say("Steinvorrat", "Brick supply")}>{[2, 4].map(length => {
      const remaining = stock.filter(x => x === length).length - bricks.filter(b => b.length === length).length;
      return <button key={length} type="button" aria-pressed={selected === length} disabled={!remaining || playback.running} onClick={() => { setSelected(length); setPreview(null); }}><Cube size={23} weight="duotone" /><strong>{length} {say("Noppen", "studs")}</strong><small>×{remaining}</small></button>;
    })}</div>
    <p className="game-caption">{say("Tippe auf einen gesetzten Stein, um ihn zurückzulegen.", "Tap a placed brick to put it back in the supply.")}</p>
    <div className="game-controls"><button type="button" className="btn btn--primary" disabled={playback.running} onClick={() => {
      onEdit(); setWon(false); setTesting(false);
      const result = checkBridge(bricks, harder);
      if (result !== "solved") { setMessage(result === "gap" ? say("Noch Lücken! Fülle beide Reihen vollständig.", "There are gaps! Fill both rows completely.") : say("Zwei Fugen liegen übereinander. Versetze die Steine in einer Reihe.", "Two joints line up. Offset the bricks in one row.")); return; }
      setMessage(say("Der Roboter testet deine Brücke…", "The robot is testing your bridge…"));
      playback.play(1, 1400, () => setTesting(true), () => { setTesting(false); setWon(true); setMessage(say("Gut verzahnt! Dein Roboter ist sicher auf der anderen Seite.", "Nicely interlocked! Your robot reached the other side.")); onSolve(); });
    }}><Play size={18} weight="fill" />{playback.running ? say("Brücke wird getestet…", "Testing your bridge…") : say("Brücke testen", "Test bridge")}</button><Reset onClick={() => { playback.cancel(); setBricks([]); setSelected(2); setPreview(null); setTesting(false); setMessage(""); onEdit(); setWon(false); }} /></div>
    <p className={`game-result${won ? " won" : ""}`} role="status">{message}</p>
    <GameHint>{harder ? say("Probiere unten 4 + 4 und oben 2 + 4 + 2. Die Fugen liegen dann versetzt.", "Try 4 + 4 on the bottom and 2 + 4 + 2 on top. The joints will be offset.") : say("Probiere oben 4 + 2 und unten 2 + 4. So enden die Steine nicht an derselben Stelle.", "Try 4 + 2 on top and 2 + 4 on the bottom. The joints end in different places.")}</GameHint>
  </div>;
}

export function SortingGame({ harder, onSolve, onEdit }: GameProps) {
  const say = useWords();
  const items = specimens.slice(0, harder ? 8 : 6);
  const [bins, setBins] = useState<(number | null)[]>(Array(items.length).fill(null));
  const [selected, setSelected] = useState<number | null>(0);
  const [errors, setErrors] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const playback = useGamePlayback();
  const capturePieces = useMovingPieces(rootRef, bins);
  const labels = harder ? [say("3 Ecken", "3 corners"), say("Andere Formen", "Other shapes")] : [say("Rund", "Round"), say("Mit Ecken", "With corners")];
  const shapeNames = { circle: say("Kreis", "circle"), triangle: say("Dreieck", "triangle"), square: say("Quadrat", "square") };
  const colorNames = { orange: say("orange", "orange"), green: say("grün", "green"), purple: say("violett", "purple") };
  const icons = { circle: Circle, triangle: Triangle, square: Square };
  const token = (i: number) => { const item = items[i]; const Icon = icons[item.shape]; return <button type="button" key={i} data-piece={i} disabled={playback.running} className={`shape-token shape-${item.color}${errors.includes(i) ? " needs-move" : ""}`} aria-pressed={selected === i} aria-label={`${i + 1}: ${shapeNames[item.shape]}, ${colorNames[item.color]}`} onClick={() => setSelected(i)}><Icon size={29} weight="fill" /><small>{i + 1}</small></button>; };
  return <div ref={rootRef} className={`hands-on-game sorting-game${playback.running ? " is-checking" : ""}`}>
    <p className="game-instruction">{say("Bring Ordnung ins Formen-Labor! Wähle ein Plättchen und dann seine Kiste. Die Form zählt, nicht die Farbe.", "Bring order to the shape lab! Select a tile, then its box. Sort by shape, not colour.")}</p>
    <div className="sort-workbench"><span className="game-tray-label">{say("DEINE DATEN", "YOUR DATA")}</span><div className="shape-tray">{items.map((_, i) => bins[i] === null ? token(i) : null)}{bins.every(b => b !== null) ? <span className="tray-empty">{say("Alle verteilt. Zeit für den Muster-Check!", "All sorted. Time to check the pattern!")}</span> : null}</div></div>
    <div className="sort-bins">{labels.map((label, bin) => <div key={bin} className="sort-bin"><div className="shape-tray">{items.map((_, i) => bins[i] === bin ? token(i) : null)}</div><button type="button" className="bin-drop" disabled={selected === null || playback.running} aria-label={say(`Ausgewähltes Plättchen zu ${label} verschieben`, `Move selected tile to ${label}`)} onClick={() => { if (selected === null) return; const next = bins.map((b, i) => i === selected ? bin : b); capturePieces(); setBins(next); setErrors([]); setMessage(""); onEdit(); const nextIndex = next.findIndex(b => b === null); setSelected(nextIndex >= 0 ? nextIndex : null); }}><strong>{label}</strong><span><ArrowRight size={16} />{selected === null ? `${bins.filter(b => b === bin).length}` : say(`Plättchen ${selected + 1} hierhin`, `Put tile ${selected + 1} here`)}</span></button><div className="sort-meter" aria-hidden="true"><span style={{ width: `${bins.filter(b => b === bin).length / items.length * 100}%` }} /></div></div>)}</div>
    <p className="game-caption">{say("Zum Verschieben ein Plättchen in seiner Kiste antippen, dann die andere Kiste wählen.", "To move a tile, select it in its box, then choose the other box.")}</p>
    <div className="game-controls"><button type="button" className="btn btn--primary" disabled={playback.running} onClick={() => { onEdit(); setErrors([]); setMessage(say("Das Labor prüft deine Formen…", "The lab is checking your shapes…")); playback.play(1, 850, () => {}, () => { const wrong = checkSorting(bins, harder); setErrors(wrong); setMessage(wrong.length ? say(`${wrong.length} Plättchen fehlen oder passen noch nicht. Die markierten kannst du umsortieren.`, `${wrong.length} tiles are missing or in the wrong box. Move the marked ones.`) : say("Muster erkannt! Aus einzelnen Formen sind geordnete Daten geworden.", "Pattern found! You turned individual shapes into organised data.")); if (!wrong.length) onSolve(); }); }}><Play size={18} weight="fill" />{playback.running ? say("Wird geprüft…", "Checking…") : say("Muster prüfen", "Check pattern")}</button><Reset onClick={() => { playback.cancel(); setBins(Array(items.length).fill(null)); setSelected(0); setErrors([]); setMessage(""); onEdit(); }} /></div>
    <p className="game-result" role="status">{message}</p>
    <GameHint>{say("Zähle die Ecken. Das ist ein festes Sortiermodell zum Ausprobieren, keine echte KI. Daten sortieren hilft auch beim Verstehen von Diagrammen.", "Count the corners. This is a fixed sorting model to play with, not a real AI. Grouping data also helps you understand charts.")}</GameHint>
  </div>;
}

export function CityGame({ onSolve, onEdit }: Omit<GameProps, "harder">) {
  const say = useWords();
  const [tiles, setTiles] = useState<Record<number, CityTile | undefined>>({});
  const [selected, setSelected] = useState<CityTile>("park");
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState(false);
  const playback = useGamePlayback();
  const neighbours: Record<number, number[]> = { 0: [1, 3], 2: [1, 5], 6: [3, 7], 8: [5, 7] };
  const icons = { park: Tree, solar: SolarPanel, water: Drop };
  const names = { park: say("Park", "Park"), solar: say("Solarfeld", "Solar panels"), water: say("Teich", "Pond") };
  return <div className="hands-on-game">
    <p className="game-instruction">{say("Deine Stadt im Mini-Format: Baue 2 Parks, 1 Solarfeld und 1 Teich. Jedes Haus braucht einen Park direkt neben sich – diagonal zählt nicht.", "Your tiny city: build 2 parks, 1 solar field and 1 pond. Every house needs a park next door — diagonals do not count.")}</p>
    <div className={`city-board${playback.running ? " is-checking" : ""}${checked ? " is-complete" : ""}`} role="group" aria-label={say("Dein Stadtplan", "Your city plan")}>{Array.from({ length: 9 }, (_, i) => {
      const tile = tiles[i]; const Icon = tile ? icons[tile] : null;
      return cityPlots.some(plot => plot === i) ? <button key={i} className={`city-plot ${tile ?? "empty"}`} type="button" disabled={playback.running} aria-label={say(`Bauplatz ${i + 1}: ${tile ? names[tile] : "leer"}. ${names[selected]} setzen.`, `Plot ${i + 1}: ${tile ? names[tile] : "empty"}. Place ${names[selected]}.`)} onClick={() => { setTiles(ts => ({ ...ts, [i]: tile === selected ? undefined : selected })); setChecked(false); setMessage(""); onEdit(); }}>{Icon ? <span className="city-piece" key={tile}><Icon size={35} weight="duotone" /></span> : <span>+</span>}<small>{tile ? names[tile] : say("Bauplatz", "Build here")}</small></button> : <div key={i} className={`city-fixed${i === 4 ? " center" : ""}${neighbours[i]?.some(n => tiles[n] === "park") ? " has-park" : ""}`}>{i === 4 ? <Buildings size={34} weight="duotone" /> : <House size={32} weight="duotone" />}<small>{i === 4 ? say("Rathaus", "Town hall") : say("Haus", "House")}</small>{neighbours[i]?.some(n => tiles[n] === "park") ? <span className="house-check" aria-label={say("Park nebenan", "Park next door")}>✓</span> : null}</div>;
    })}</div>
    <div className="city-palette">{(["park", "solar", "water"] as const).map(tile => { const Icon = icons[tile]; return <button key={tile} type="button" aria-pressed={selected === tile} onClick={() => setSelected(tile)}><Icon size={22} weight="duotone" /><span>{names[tile]}<small>{Object.values(tiles).filter(t => t === tile).length}/{tile === "park" ? 2 : 1}</small></span></button>; })}</div>
    <div className="game-controls"><button type="button" className="btn btn--primary" disabled={playback.running} onClick={() => { onEdit(); setChecked(false); setMessage(say("Ein Rundgang durch deine Stadt…", "Taking a walk through your city…")); playback.play(1, 1100, () => {}, () => { const result = checkCity(tiles); setChecked(result === "solved"); setMessage({ missing: say("Fülle zuerst die vier Bauplätze.", "Fill all four plots first."), balance: say("Du brauchst genau 2 Parks, 1 Solarfeld und 1 Teich.", "You need exactly 2 parks, 1 solar field and 1 pond."), parks: say("Ein Haus hat noch keinen Park direkt neben sich. Verschiebe deine Parks.", "A house still has no park next door. Move your parks."), solved: say("Deine kleine Stadt ist bereit! Jedes Haus hat einen Park in der Nähe.", "Your tiny city is ready! Every house has a park nearby.") }[result]); if (result === "solved") onSolve(); }); }}><Play size={18} weight="fill" />{playback.running ? say("Stadt wird erkundet…", "Exploring your city…") : say("Stadt ausprobieren", "Test your city")}</button><Reset onClick={() => { playback.cancel(); setTiles({}); setChecked(false); setMessage(""); onEdit(); }} /></div>
    <p className="game-result" role="status">{message}</p>
    <GameHint>{say("Setze die Parks gegenüber voneinander. Ein Park oben in der Mitte liegt neben beiden oberen Häusern.", "Place the parks on opposite sides. A park at the top centre is next to both top houses.")}</GameHint>
  </div>;
}
