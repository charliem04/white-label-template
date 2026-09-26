/**
 * Questions people actually ask before they call, answered in the open
 * rather than hidden behind an accordion that has to be fought with on
 * a phone. The first one starts open; the rest are one tap away, and
 * they are real <details> elements, so find-in-page and the keyboard
 * both work without any of this component’s help.
 *
 * Emits FAQPage structured data from the same array that renders the
 * list, so the two can never say different things.
 */
import type { Faq } from "@/content/types";
import { SectionHead } from "./SectionHead";

export function FaqList({
  faqs,
  heading = "Questions people ask",
  lede,
}: {
  faqs: Faq[];
  heading?: string;
  lede?: string;
}) {
  if (faqs.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section className="band bg-surface">
      <div className="section">
        <SectionHead heading={heading} lede={lede} />
        <div className="mt-10 border-t border-line">
          {faqs.map((f, i) => (
            <details
              key={f.q}
              open={i === 0}
              className="group border-b border-line py-5"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 font-display text-[21px] font-bold uppercase leading-tight text-ink transition-colors duration-150 hover:text-brand active:text-brand-strong">
                {f.q}
                <span
                  aria-hidden
                  className="mt-1 shrink-0 font-mono text-base text-brand-soft group-open:hidden"
                >
                  +
                </span>
                <span
                  aria-hidden
                  className="mt-1 hidden shrink-0 font-mono text-base text-brand-soft group-open:block"
                >
                  −
                </span>
              </summary>
              <p className="mt-3 max-w-[68ch]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
    </section>
  );
}
