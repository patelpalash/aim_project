import type { Interest, LocalizedText } from "./contracts.ts";

export type SequenceCommand = "forward" | "left" | "right";
export type Heading = "north" | "east" | "south" | "west";
interface PuzzleBase { id: string; title: LocalizedText; instructions: LocalizedText; interestIds: readonly Interest[] }
export interface PatternPuzzle extends PuzzleBase {
  kind: "pattern";
  sequence: readonly (string | null)[];
  choices: readonly { id: string; label: LocalizedText }[];
  correctChoiceId: string;
  explanation: LocalizedText;
}
export interface SequencePuzzle extends PuzzleBase {
  kind: "sequence";
  width: number; height: number;
  start: { x: number; y: number; heading: Heading };
  goal: { x: number; y: number };
  blocked: readonly { x: number; y: number }[];
  initialCommands: readonly (SequenceCommand | null)[];
}
export type PuzzleDefinition = PatternPuzzle | SequencePuzzle;
export interface SequenceStep { step: number; x: number; y: number; heading: Heading; command: SequenceCommand | null }
export interface PuzzleResult {
  status: "correct" | "try-again" | "incomplete" | "invalid";
  message: LocalizedText;
  suggestedInterests: Interest[];
  trace?: SequenceStep[];
  failure?: "boundary" | "obstacle" | "not-at-goal";
}
export const PUZZLES: readonly PuzzleDefinition[] = [
  { id: "pattern-alternating", kind: "pattern", title: { de: "Was kommt als Nächstes?", en: "What comes next?" },
    instructions: { de: "Wähle die fehlende Form.", en: "Choose the missing shape." },
    sequence: ["circle", "square", "circle", "square", null],
    choices: [{ id: "circle", label: { de: "Kreis", en: "Circle" } }, { id: "square", label: { de: "Quadrat", en: "Square" } }, { id: "triangle", label: { de: "Dreieck", en: "Triangle" } }],
    correctChoiceId: "circle", explanation: { de: "Kreis und Quadrat wechseln sich ab.", en: "Circle and square alternate." }, interestIds: ["solve-puzzles"] },
  { id: "pattern-pairs", kind: "pattern", title: { de: "Entdecke die Paare", en: "Discover the pairs" },
    instructions: { de: "Welche Form vervollständigt das Paar?", en: "Which shape completes the pair?" },
    sequence: ["circle", "circle", "triangle", "triangle", "square", null],
    choices: [{ id: "circle", label: { de: "Kreis", en: "Circle" } }, { id: "square", label: { de: "Quadrat", en: "Square" } }, { id: "triangle", label: { de: "Dreieck", en: "Triangle" } }],
    correctChoiceId: "square", explanation: { de: "Jede Form kommt zweimal hintereinander.", en: "Each shape appears twice in a row." }, interestIds: ["solve-puzzles", "make-art"] },
  { id: "sequence-path", kind: "sequence", title: { de: "Repariere den Weg", en: "Repair the path" },
    instructions: { de: "Ergänze die Befehle. Deine Figur soll am Ende im Ziel stehen.", en: "Complete the instructions. Your character should finish at the goal." },
    width: 4, height: 4, start: { x: 0, y: 0, heading: "east" }, goal: { x: 2, y: 1 }, blocked: [{ x: 1, y: 1 }],
    initialCommands: ["forward", null, "right", "forward"], interestIds: ["robots", "solve-puzzles", "build-games"] }
];

export function getPuzzleDefinition(id: string): PuzzleDefinition | undefined { return PUZZLES.find(puzzle => puzzle.id === id); }
const text = (de: string, en: string): LocalizedText => ({ de, en });

export function evaluatePatternPuzzle(id: string, choiceId: string | null): PuzzleResult {
  const puzzle = getPuzzleDefinition(id);
  if (!puzzle || puzzle.kind !== "pattern") throw new RangeError("Unknown pattern puzzle");
  const suggestedInterests = [...puzzle.interestIds];
  if (choiceId === null) return { status: "incomplete", message: text("Wähle zuerst eine Form.", "Choose a shape first."), suggestedInterests };
  if (!puzzle.choices.some(choice => choice.id === choiceId)) return { status: "invalid", message: text("Diese Auswahl gibt es hier nicht.", "That choice is not available here."), suggestedInterests };
  return { status: choiceId === puzzle.correctChoiceId ? "correct" : "try-again", message: puzzle.explanation, suggestedInterests };
}

export function evaluateSequencePuzzle(id: string, commands: readonly (SequenceCommand | null)[]): PuzzleResult {
  const puzzle = getPuzzleDefinition(id);
  if (!puzzle || puzzle.kind !== "sequence") throw new RangeError("Unknown sequence puzzle");
  const suggestedInterests = [...puzzle.interestIds];
  const trace: SequenceStep[] = [{ ...puzzle.start, step: 0, command: null }];
  if (!Array.isArray(commands) || commands.length > 12 || commands.some(command => command !== null && !["forward", "left", "right"].includes(command)))
    return { status: "invalid", message: text("Nutze höchstens zwölf gültige Befehle.", "Use up to twelve valid instructions."), suggestedInterests, trace };
  if (!commands.length || commands.some(command => command === null))
    return { status: "incomplete", message: text("Ergänze die fehlenden Befehle.", "Complete the missing instructions."), suggestedInterests, trace };
  const headings: Heading[] = ["north", "east", "south", "west"];
  let { x, y, heading } = puzzle.start;
  for (const [index, command] of commands.entries()) {
    if (command === "left" || command === "right") heading = headings[(headings.indexOf(heading) + (command === "left" ? 3 : 1)) % 4];
    else {
      const [dx, dy] = heading === "north" ? [0, -1] : heading === "east" ? [1, 0] : heading === "south" ? [0, 1] : [-1, 0];
      const nextX = x + dx, nextY = y + dy;
      const failure = nextX < 0 || nextX >= puzzle.width || nextY < 0 || nextY >= puzzle.height ? "boundary" :
        puzzle.blocked.some(cell => cell.x === nextX && cell.y === nextY) ? "obstacle" : null;
      if (failure) return { status: "try-again", failure, trace, suggestedInterests,
        message: failure === "boundary" ? text("Der nächste Schritt führt vom Feld. Ändere deine Befehle.", "The next step leaves the board. Change your instructions.") : text("Hier ist ein Hindernis. Probiere einen anderen Weg.", "There is an obstacle here. Try another path.") };
      x = nextX; y = nextY;
    }
    trace.push({ step: index + 1, x, y, heading, command });
  }
  const correct = x === puzzle.goal.x && y === puzzle.goal.y;
  return { status: correct ? "correct" : "try-again", trace, suggestedInterests,
    ...(correct ? {} : { failure: "not-at-goal" as const }),
    message: correct ? text("Deine Befehle führen zum Ziel!", "Your instructions reach the goal!") : text("Das Ziel ist noch nicht erreicht. Du kannst die Schritte ändern.", "The goal has not been reached yet. You can change the steps.") };
}
