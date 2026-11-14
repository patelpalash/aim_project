import type { Interest, LocalizedText, Taxonomy } from "./contracts.ts";
import { DEFAULT_TAXONOMY } from "./taxonomy.ts";

export interface QuizChoice { id: string; label: LocalizedText; interestIds: readonly Interest[] }
export interface QuizQuestion { id: string; label: LocalizedText; choices: readonly QuizChoice[] }
export const QUIZ_QUESTIONS: readonly QuizQuestion[] = [
  { id: "project", label: { de: "Was möchtest du ausprobieren?", en: "What would you like to try?" }, choices: [
    { id: "robot", label: { de: "Einen Roboter steuern", en: "Guide a robot" }, interestIds: ["robots", "solve-puzzles"] },
    { id: "game", label: { de: "Ein Spiel erfinden", en: "Invent a game" }, interestIds: ["build-games", "tell-stories"] },
    { id: "picture", label: { de: "Bilder gestalten", en: "Create pictures" }, interestIds: ["make-art", "tell-stories"] }
  ] },
  { id: "activity", label: { de: "Was sieht spannend aus?", en: "What looks interesting?" }, choices: [
    { id: "puzzle", label: { de: "Ein Rätsel lösen", en: "Solve a puzzle" }, interestIds: ["solve-puzzles"] },
    { id: "build", label: { de: "Etwas Eigenes bauen", en: "Build something of my own" }, interestIds: ["build-games", "make-art"] },
    { id: "story", label: { de: "Eine Geschichte erzählen", en: "Tell a story" }, interestIds: ["tell-stories"] }
  ] },
  { id: "next", label: { de: "Was würdest du gern noch versuchen?", en: "What would you like to try next?" }, choices: [
    { id: "commands", label: { de: "Mit Befehlen etwas bewegen", en: "Move something with instructions" }, interestIds: ["robots", "build-games"] },
    { id: "patterns", label: { de: "Muster entdecken", en: "Discover patterns" }, interestIds: ["solve-puzzles"] },
    { id: "characters", label: { de: "Figuren und Bilder erfinden", en: "Invent characters and pictures" }, interestIds: ["make-art", "tell-stories"] }
  ] }
];

export function getQuizChoice(questionId: string, choiceId: string): QuizChoice | undefined {
  return QUIZ_QUESTIONS.find(question => question.id === questionId)?.choices.find(choice => choice.id === choiceId);
}

/** Only explicit preferences contribute; skip is represented by a missing answer. */
export function getQuizSuggestions(answers: Readonly<Record<string, string>>, taxonomy: Taxonomy = DEFAULT_TAXONOMY) {
  const matches = new Map<string, number>();
  for (const [questionId, choiceId] of Object.entries(answers)) {
    const choice = getQuizChoice(questionId, choiceId);
    if (!choice) throw new RangeError("Unknown quiz question or choice");
    for (const id of new Set(choice.interestIds)) matches.set(id, (matches.get(id) ?? 0) + 1);
  }
  const interests = taxonomy.interests.filter(interest => interest.enabled && matches.has(interest.id)).map(interest => ({
    id: interest.id, label: interest.label, matchedChoices: matches.get(interest.id)!
  })).sort((a, b) => b.matchedChoices - a.matchedChoices || a.id.localeCompare(b.id, "en"));
  return { answeredCount: Object.keys(answers).length, totalQuestions: QUIZ_QUESTIONS.length, interestIds: interests.slice(0, 3).map(interest => interest.id), interests: interests.slice(0, 3) };
}
