import { getActiveTopics } from "@/shared/taxonomy";

/** Minimal bootstrap surface. Ishan owns the complete visual implementation. */
export default function HomePage() {
  return (
    <main>
      <h1>Interest Atlas</h1>
      <p>Lernangebote in Heilbronn entdecken.</p>
      <ul>{getActiveTopics().map(topic => <li key={topic.id}>{topic.label.de}</li>)}</ul>
      <p>Vorschau: Die interaktive Entdeckung entsteht gerade.</p>
    </main>
  );
}
