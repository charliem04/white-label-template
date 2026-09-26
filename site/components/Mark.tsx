import type { ReactNode } from "react";

/**
 * Pulls named phrases out of a run of small print.
 *
 * Financial fine print is written to be skimmed past, and the clauses
 * that actually change what someone signs — subject to credit approval,
 * not offers of credit, does not affect your credit score — are the
 * ones a reader most needs and is least likely to reach. Emphasis is
 * doing an honest job here: it lifts the qualifications, not the
 * inducements.
 *
 * ── ON THE COLOUR, WHICH IS TONE-DEPENDENT ON PURPOSE ───────────────
 * The action accent is re-declared per ground (see THE ACCENT ON DARK
 * GROUNDS in globals.css), and the light-ground value is tuned as a
 * button fill, not for small print. So the deep ground gets the accent
 * (6.2:1 there in the template skin) and the light ground gets
 * --brand (12.4:1 on paper). The skin this came from used a light gold
 * that measured ~1.5:1 on white, which is why the split exists at all;
 * picking one and using it everywhere ships unreadable small print on
 * half the page. Re-check both numbers after a re-skin.
 *
 * This is also the one place the accent carries text below button size, which
 * the palette notes in globals.css otherwise rule out. It is deliberate
 * and it is bounded to this component: a few words of legal emphasis on
 * the deep ground, never body copy.
 * ────────────────────────────────────────────────────────────────────
 */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function Mark({
  text,
  phrases,
  tone = "light",
  className,
}: {
  text: string;
  /** Exact substrings to lift. Matched case-sensitively, in order. */
  phrases: readonly string[];
  tone?: "light" | "deep";
  className?: string;
}) {
  if (phrases.length === 0) return <p className={className}>{text}</p>;

  const pattern = new RegExp(`(${phrases.map(escape).join("|")})`, "g");
  const parts = text.split(pattern);
  const lift = tone === "deep" ? "text-accent" : "text-brand";

  return (
    <p className={className}>
      {parts.map((part, i) =>
        // split() with one capture group puts the matches at odd indices.
        i % 2 === 1 ? (
          <strong key={i} className={`font-semibold ${lift}`}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part as ReactNode}</span>
        )
      )}
    </p>
  );
}
