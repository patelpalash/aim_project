/** Paper bird guide. Decorative: hints it "says" are always rendered as real text beside it. */
export function PaperBird({ size = 72, idle = true }: { size?: number; idle?: boolean }) {
  return (
    <svg className={idle ? "m-bob" : undefined} width={size} height={size * 0.75} viewBox="0 0 110 82" aria-hidden="true">
      <polygon points="8,42 62,8 52,44" fill="#ffc93c" stroke="#1b2230" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="52,44 62,8 104,52" fill="#ff5a4e" stroke="#1b2230" strokeWidth="3" strokeLinejoin="round" />
      <polygon points="8,42 52,44 38,70" fill="#2f7cf6" stroke="#1b2230" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="78" cy="38" r="3" fill="#1b2230" />
    </svg>
  );
}
