"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]", "button:not([disabled])", "input:not([disabled])", "select:not([disabled])",
  "textarea:not([disabled])", "summary", "[tabindex]:not([tabindex='-1'])"
].join(",");

/** Focusable children in DOM order, skipping anything hidden or inside a hidden subtree. */
function focusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter(el => !el.hasAttribute("inert") && el.offsetParent !== null && !el.closest("[aria-hidden='true']"));
}

/**
 * I6 follow-up: keyboard behaviour shared by every modal sheet.
 * - Moves focus into the dialog when it opens (`initial`, else the first focusable child).
 * - Keeps Tab and Shift+Tab inside it, so the page behind can never be reached by keyboard.
 * - Esc closes.
 * - Returns focus to whatever was focused before, and if that element is gone — a card that was
 *   removed, for example — to `fallback`, so focus never drops to the top of the document.
 */
export function useDialog<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClose: () => void,
  options: { initial?: RefObject<HTMLElement | null>; fallback?: RefObject<HTMLElement | null> } = {}
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const { initial, fallback } = options;
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const fallbackRef = useRef(fallback);
  fallbackRef.current = fallback;

  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const target = initialRef.current?.current ?? (dialog ? focusable(dialog)[0] : null);
    target?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopPropagation(); closeRef.current(); return; }
      if (event.key !== "Tab" || !dialog) return;
      const items = focusable(dialog);
      if (!items.length) { event.preventDefault(); dialog.focus(); return; }
      const first = items[0]!, last = items[items.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      // Wrap at the ends, and pull focus back in if it escaped the dialog entirely.
      if (!active || !dialog.contains(active)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); return; }
      if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const back = previous && previous.isConnected ? previous : fallbackRef.current?.current ?? null;
      back?.focus?.();
    };
    // The dialog mounts and unmounts with the open state, so this runs once per opening.
  }, [ref]);
}
