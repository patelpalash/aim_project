"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowBendUpLeft, ArrowBendUpRight, ArrowCounterClockwise, ArrowRight, ArrowUp, Buildings, Circle, Cube, Drop, FlagCheckered, House, Lightbulb, Mountains, Play, Repeat, Robot, RocketLaunch, SolarPanel, Square, Tree, Triangle, X } from "@phosphor-icons/react";
import { useLocale } from "../i18n";
import { bridgeStock, canPlaceBrick, checkBridge, checkCity, checkSorting, cityPlots, routeBoard, runRoute, specimens, type Brick, type CityTile, type Command, type Pose, type RunResult } from "./challenge";

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
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
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
  const reset = () => { onEdit(); if (timer.current) clearTimeout(timer.current); setCommands([]); setTrace([]); setPose(board.start); setResult(null); setRunning(false); };
  const run = () => {
    const outcome = runRoute(board, commands);
    setResult(null); setTrace([]); setPose(board.start);
    // Open the source in this trusted click, before any timer, so popup blockers can allow it.
    if (outcome.solved) onSolve();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPose(outcome.trace.at(-1)!); setTrace(outcome.trace); setResult(outcome); return; }
    setRunning(true);
    let step = 0;
    const tick = () => {
      setPose(outcome.trace[step]); setTrace(outcome.trace.slice(0, step + 1)); step++;
      if (step < outcome.trace.length) timer.current = setTimeout(tick, 240);
      else { setRunning(false); setResult(outcome); }
    };
    tick();
  };
  const Character = coding ? RocketLaunch : Robot;
  return <div className="hands-on-game">
    <p className="game-instruction">{coding ? say("Programmiere den Weg zur Flagge. Nutze eine 2×-Schleife und höchstens", "Code a route to the flag. Use a 2× loop and at most") : say("Baue einen Weg aus Befehlen. Der Roboter soll zur Flagge, ohne Felsen zu berühren. Höchstens", "Build a path with commands. Get the robot to the flag without hitting rocks. At most")} <strong>{board.limit} {say("Blöcke.", "blocks.")}</strong></p>
    <div className="route-stage">
      <div className="route-board" style={{ "--size": board.size } as CSSProperties} role="img" aria-label={say(`Spielfeld ${board.size} mal ${board.size}. Start unten links, Ziel oben rechts. Felsen: ${board.rocks.map(i => `${i % board.size + 1}/${Math.floor(i / board.size) + 1}`).join(", ")}.`, `${board.size} by ${board.size} board. Start bottom left, goal top right. Rocks at column/row: ${board.rocks.map(i => `${i % board.size + 1}/${Math.floor(i / board.size) + 1}`).join(", ")}.`)}>
        {Array.from({ length: board.size ** 2 }, (_, i) => <div key={i} className={`route-cell${board.rocks.includes(i) ? " rock" : ""}${trace.some(p => p.y * board.size + p.x === i) ? " visited" : ""}`}>
          {board.rocks.includes(i) ? <Mountains size={27} weight="fill" /> : i === board.goal[1] * board.size + board.goal[0] ? <FlagCheckered size={28} weight="fill" /> : null}
        </div>)}
        <div className="route-character" style={{ left: `${pose.x / board.size * 100}%`, top: `${pose.y / board.size * 100}%` }}><Character size={31} weight="duotone" /><ArrowUp className="route-facing" size={15} weight="bold" style={{ transform: `rotate(${pose.direction * 90}deg)` }} /></div>
      </div>
      <p className="game-caption" aria-live="off">{say("Blick nach", "Facing")} <strong>{directions[pose.direction]}</strong> · {say("Spalte", "Column")} {pose.x + 1}, {say("Zeile", "row")} {pose.y + 1}</p>
    </div>
    <div className="command-palette" aria-label={say("Befehle hinzufügen", "Add commands")}>{(coding ? ["forward", "left", "right", "repeat"] : ["forward", "left", "right"]).map(c => {
      const command = c as Command; const Icon = icons[command];
      return <button key={command} type="button" disabled={running || commands.length >= board.limit} onClick={() => { onEdit(); setCommands([...commands, command]); setResult(null); }}><Icon size={20} />{labels[command]}<span>+</span></button>;
    })}</div>
    <div className="program-tray"><div className="game-tray-label"><span>{say("DEIN PROGRAMM", "YOUR PROGRAMME")}</span><span>{commands.length}/{board.limit}</span></div>
      <ol className="program-blocks">{commands.length ? commands.map((c, i) => { const Icon = icons[c]; return <li key={i}><button type="button" disabled={running} aria-label={say(`Befehl ${i + 1} entfernen: ${labels[c]}`, `Remove command ${i + 1}: ${labels[c]}`)} onClick={() => { onEdit(); setCommands(commands.filter((_, j) => j !== i)); setResult(null); }}><small>{i + 1}</small><Icon size={18} />{c === "repeat" ? "2×" : null}<X size={12} /></button></li>; }) : <li className="tray-empty">{say("Tippe oben auf die Befehle. Antippen im Programm entfernt sie.", "Tap commands above to add them. Tap a block here to remove it.")}</li>}</ol>
    </div>
    <div className="game-controls"><button type="button" className="btn btn--primary" disabled={!commands.length || running} onClick={run}><Play size={18} weight="fill" />{running ? say("Unterwegs…", "On the move…") : say("Programm starten", "Run programme")}</button><Reset onClick={reset} /></div>
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
  const width = harder ? 8 : 6;
  const stock = bridgeStock(harder);
  const place = (row: number, start: number) => {
    const brick = { row, start, length: selected };
    if (!canPlaceBrick(bricks, brick, width, stock)) { setMessage(say("Hier passt dieser Stein nicht. Wähle einen freien Platz oder einen anderen Stein.", "This brick does not fit here. Try another space or brick.")); return; }
    onEdit(); setBricks([...bricks, brick]); setMessage(""); onEdit(); setWon(false);
  };
  return <div className="hands-on-game">
    <p className="game-instruction">{say("Baue eine Brücke aus zwei vollen Steinreihen. Die Fugen dürfen nicht direkt übereinander liegen. Wähle einen Stein, dann sein Startfeld.", "Build a bridge with two complete rows of bricks. Joints must not line up vertically. Pick a brick, then its starting space.")}</p>
    <div className={`bridge-stage${won ? " bridge-won" : ""}`}>
      <div className="bridge-crossing" aria-hidden="true"><Robot size={28} weight="duotone" /><FlagCheckered size={26} weight="fill" /></div>
      <div className="brick-board" style={{ "--columns": width } as CSSProperties} role="group" aria-label={say("Brücke: zwei Reihen", "Bridge: two rows")}>
        {[0, 1].flatMap(row => Array.from({ length: width }, (_, col) => {
          const brick = bricks.find(b => b.row === row && b.start <= col && col < b.start + b.length);
          if (brick && brick.start !== col) return null;
          return <button key={`${row}-${col}`} type="button" className={brick ? `placed-brick brick-${brick.length}` : "brick-slot"} style={{ gridColumn: `${col + 1} / span ${brick?.length ?? 1}`, gridRow: row + 1 }} aria-label={brick ? say(`Stein entfernen: Reihe ${row + 1}, Feld ${col + 1}, Länge ${brick.length}`, `Remove brick: row ${row + 1}, space ${col + 1}, length ${brick.length}`) : say(`Stein setzen: Reihe ${row + 1}, Feld ${col + 1}`, `Place brick: row ${row + 1}, space ${col + 1}`)} onClick={() => { if (brick) { onEdit(); setBricks(bricks.filter(b => b !== brick)); setWon(false); setMessage(""); onEdit(); } else place(row, col); }}>
            {brick ? <><span className="brick-studs" aria-hidden="true">{Array.from({ length: brick.length }, (_, i) => <i key={i} />)}</span><span>{brick.length}<X size={12} /></span></> : <span>{col + 1}</span>}
          </button>;
        }))}
      </div>
      <div className="bridge-river" aria-hidden="true">≈ &nbsp; ≈ &nbsp; ≈ &nbsp; ≈ &nbsp; ≈</div>
    </div>
    <div className="brick-palette" role="group" aria-label={say("Steinvorrat", "Brick supply")}>{[2, 4].map(length => {
      const remaining = stock.filter(x => x === length).length - bricks.filter(b => b.length === length).length;
      return <button key={length} type="button" aria-pressed={selected === length} disabled={!remaining} onClick={() => setSelected(length)}><Cube size={23} weight="duotone" /><strong>{length} {say("Noppen", "studs")}</strong><small>×{remaining}</small></button>;
    })}</div>
    <p className="game-caption">{say("Tippe auf einen gesetzten Stein, um ihn zurückzulegen.", "Tap a placed brick to put it back in the supply.")}</p>
    <div className="game-controls"><button type="button" className="btn btn--primary" onClick={() => { const result = checkBridge(bricks, harder); setWon(result === "solved"); setMessage(result === "gap" ? say("Noch Lücken! Fülle beide Reihen vollständig.", "There are gaps! Fill both rows completely.") : result === "seam" ? say("Zwei Fugen liegen übereinander. Versetze die Steine in einer Reihe.", "Two joints line up. Offset the bricks in one row.") : say("Gut verzahnt! Dein Roboter kann die Modellbrücke überqueren.", "Nicely interlocked! Your robot can cross the model bridge.")); if (result === "solved") onSolve(); }}><Play size={18} weight="fill" />{say("Brücke testen", "Test bridge")}</button><Reset onClick={() => { setBricks([]); setSelected(2); setMessage(""); onEdit(); setWon(false); }} /></div>
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
  const labels = harder ? [say("3 Ecken", "3 corners"), say("Andere Formen", "Other shapes")] : [say("Rund", "Round"), say("Mit Ecken", "With corners")];
  const shapeNames = { circle: say("Kreis", "circle"), triangle: say("Dreieck", "triangle"), square: say("Quadrat", "square") };
  const colorNames = { orange: say("orange", "orange"), green: say("grün", "green"), purple: say("violett", "purple") };
  const icons = { circle: Circle, triangle: Triangle, square: Square };
  const token = (i: number) => { const item = items[i]; const Icon = icons[item.shape]; return <button type="button" key={i} className={`shape-token shape-${item.color}${errors.includes(i) ? " needs-move" : ""}`} aria-pressed={selected === i} aria-label={`${i + 1}: ${shapeNames[item.shape]}, ${colorNames[item.color]}`} onClick={() => setSelected(i)}><Icon size={29} weight="fill" /><small>{i + 1}</small></button>; };
  return <div className="hands-on-game">
    <p className="game-instruction">{say("Bring Ordnung ins Formen-Labor! Wähle ein Plättchen und dann seine Kiste. Die Form zählt, nicht die Farbe.", "Bring order to the shape lab! Select a tile, then its box. Sort by shape, not colour.")}</p>
    <div className="sort-workbench"><span className="game-tray-label">{say("DEINE DATEN", "YOUR DATA")}</span><div className="shape-tray">{items.map((_, i) => bins[i] === null ? token(i) : null)}{bins.every(b => b !== null) ? <span className="tray-empty">{say("Alle verteilt. Zeit für den Muster-Check!", "All sorted. Time to check the pattern!")}</span> : null}</div></div>
    <div className="sort-bins">{labels.map((label, bin) => <div key={bin} className="sort-bin"><div className="shape-tray">{items.map((_, i) => bins[i] === bin ? token(i) : null)}</div><button type="button" className="bin-drop" disabled={selected === null} onClick={() => { if (selected === null) return; const next = bins.map((b, i) => i === selected ? bin : b); setBins(next); setErrors([]); setMessage(""); onEdit(); const nextIndex = next.findIndex(b => b === null); setSelected(nextIndex >= 0 ? nextIndex : null); }}><strong>{label}</strong><span><ArrowRight size={16} />{selected === null ? `${bins.filter(b => b === bin).length}` : say(`Plättchen ${selected + 1} hierhin`, `Put tile ${selected + 1} here`)}</span></button><div className="sort-meter" aria-hidden="true"><span style={{ width: `${bins.filter(b => b === bin).length / items.length * 100}%` }} /></div></div>)}</div>
    <p className="game-caption">{say("Zum Verschieben ein Plättchen in seiner Kiste antippen, dann die andere Kiste wählen.", "To move a tile, select it in its box, then choose the other box.")}</p>
    <div className="game-controls"><button type="button" className="btn btn--primary" onClick={() => { const wrong = checkSorting(bins, harder); setErrors(wrong); setMessage(wrong.length ? say(`${wrong.length} Plättchen fehlen oder passen noch nicht. Die markierten kannst du umsortieren.`, `${wrong.length} tiles are missing or in the wrong box. Move the marked ones.`) : say("Muster erkannt! Aus einzelnen Formen sind geordnete Daten geworden.", "Pattern found! You turned individual shapes into organised data.")); if (!wrong.length) onSolve(); }}><Play size={18} weight="fill" />{say("Muster prüfen", "Check pattern")}</button><Reset onClick={() => { setBins(Array(items.length).fill(null)); setSelected(0); setErrors([]); setMessage(""); onEdit(); }} /></div>
    <p className="game-result" role="status">{message}</p>
    <GameHint>{say("Zähle die Ecken. Das ist ein festes Sortiermodell zum Ausprobieren, keine echte KI. Daten sortieren hilft auch beim Verstehen von Diagrammen.", "Count the corners. This is a fixed sorting model to play with, not a real AI. Grouping data also helps you understand charts.")}</GameHint>
  </div>;
}

export function CityGame({ onSolve, onEdit }: Omit<GameProps, "harder">) {
  const say = useWords();
  const [tiles, setTiles] = useState<Record<number, CityTile | undefined>>({});
  const [selected, setSelected] = useState<CityTile>("park");
  const [message, setMessage] = useState("");
  const icons = { park: Tree, solar: SolarPanel, water: Drop };
  const names = { park: say("Park", "Park"), solar: say("Solarfeld", "Solar panels"), water: say("Teich", "Pond") };
  return <div className="hands-on-game">
    <p className="game-instruction">{say("Deine Stadt im Mini-Format: Baue 2 Parks, 1 Solarfeld und 1 Teich. Jedes Haus braucht einen Park direkt neben sich – diagonal zählt nicht.", "Your tiny city: build 2 parks, 1 solar field and 1 pond. Every house needs a park next door — diagonals do not count.")}</p>
    <div className="city-board" role="group" aria-label={say("Dein Stadtplan", "Your city plan")}>{Array.from({ length: 9 }, (_, i) => {
      const tile = tiles[i]; const Icon = tile ? icons[tile] : null;
      return cityPlots.some(plot => plot === i) ? <button key={i} className={`city-plot ${tile ?? "empty"}`} type="button" aria-label={say(`Bauplatz ${i + 1}: ${tile ? names[tile] : "leer"}. ${names[selected]} setzen.`, `Plot ${i + 1}: ${tile ? names[tile] : "empty"}. Place ${names[selected]}.`)} onClick={() => { setTiles({ ...tiles, [i]: tile === selected ? undefined : selected }); setMessage(""); onEdit(); }}>{Icon ? <Icon size={35} weight="duotone" /> : <span>+</span>}<small>{tile ? names[tile] : say("Bauplatz", "Build here")}</small></button> : <div key={i} className={`city-fixed${i === 4 ? " center" : ""}`}>{i === 4 ? <Buildings size={34} weight="duotone" /> : <House size={32} weight="duotone" />}<small>{i === 4 ? say("Rathaus", "Town hall") : say("Haus", "House")}</small></div>;
    })}</div>
    <div className="city-palette">{(["park", "solar", "water"] as const).map(tile => { const Icon = icons[tile]; return <button key={tile} type="button" aria-pressed={selected === tile} onClick={() => setSelected(tile)}><Icon size={22} weight="duotone" /><span>{names[tile]}<small>{Object.values(tiles).filter(t => t === tile).length}/{tile === "park" ? 2 : 1}</small></span></button>; })}</div>
    <div className="game-controls"><button type="button" className="btn btn--primary" onClick={() => { const result = checkCity(tiles); setMessage({ missing: say("Fülle zuerst die vier Bauplätze.", "Fill all four plots first."), balance: say("Du brauchst genau 2 Parks, 1 Solarfeld und 1 Teich.", "You need exactly 2 parks, 1 solar field and 1 pond."), parks: say("Ein Haus hat noch keinen Park direkt neben sich. Verschiebe deine Parks.", "A house still has no park next door. Move your parks."), solved: say("Deine kleine Stadt ist bereit! Jedes Haus hat einen Park in der Nähe.", "Your tiny city is ready! Every house has a park nearby.") }[result]); if (result === "solved") onSolve(); }}><Play size={18} weight="fill" />{say("Stadt ausprobieren", "Test your city")}</button><Reset onClick={() => { setTiles({}); setMessage(""); onEdit(); }} /></div>
    <p className="game-result" role="status">{message}</p>
    <GameHint>{say("Setze die Parks gegenüber voneinander. Ein Park oben in der Mitte liegt neben beiden oberen Häusern.", "Place the parks on opposite sides. A park at the top centre is next to both top houses.")}</GameHint>
  </div>;
}
