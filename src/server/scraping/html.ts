/** Minimal, dependency-free HTML helpers for scoped extraction of known provider markup. */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß", eacute: "é", bdquo: "„",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", euro: "€", shy: "", bull: "•", middot: "·",
  // aim writes "&uumlck" without the semicolon in some static labels.
};

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name] ?? m);
}

/** Convert an HTML fragment to readable plain text (block elements become line breaks). */
export function htmlToText(fragment: string): string {
  return decodeEntities(fragment
    .replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6]|ul|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t ]+/g, " ")
    .split("\n").map(line => line.trim()).filter(Boolean).join("\n");
}

export const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Return the HTML of the element opened at `start` (index of its "<tag"),
 * balancing nested tags of the same name. Returns null for unbalanced markup.
 */
export function elementAt(html: string, start: number): string | null {
  const open = /^<([a-z0-9]+)/i.exec(html.slice(start));
  if (!open) return null;
  const tag = open[1].toLowerCase();
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = start;
  let depth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    if (m[0].endsWith("/>")) continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index + m[0].length);
  }
  return null;
}

/** First element whose opening tag matches `openingTag` (a regex over the opening tag). */
export function findElement(html: string, openingTag: RegExp): string | null {
  const m = openingTag.exec(html);
  return m ? elementAt(html, m.index) : null;
}

export function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\b${name}="([^"]*)"`, "i").exec(tag);
  return m ? decodeEntities(m[1]) : null;
}
