import { BookOpen, Code, Cube, GameController, Palette, PuzzlePiece, Robot, Sparkle } from "@phosphor-icons/react";

export function AtlasIcon({ interest, size = 25 }: { interest?: string; size?: number }) {
  const Icon = interest === "build-games" ? GameController : interest === "robots" ? Robot : interest === "make-art" ? Palette : interest === "solve-puzzles" ? PuzzlePiece : interest === "tell-stories" ? BookOpen : interest === "build-worlds" ? Cube : interest === "build-apps" ? Code : Sparkle;
  return <Icon size={size} weight="duotone" aria-hidden="true" />;
}
