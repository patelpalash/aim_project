import { TOPICS } from "@/shared/contracts";

const labels: Record<string, string> = { ai: "KI", coding: "Coding", gaming: "Gaming" };

/** Minimal bootstrap surface. Ishan owns the complete visual implementation. */
export default function HomePage() {
  return (
    <main>
      <h1>Interest Atlas</h1>
      <p>Lernangebote in Heilbronn entdecken.</p>
      <ul>{TOPICS.map(topic => <li key={topic}>{labels[topic]}</li>)}</ul>
      <p>Vorschau: Die interaktive Entdeckung entsteht gerade.</p>
    </main>
  );
}
