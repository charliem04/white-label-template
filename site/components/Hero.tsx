"use client";

/**
 * The home page opening. Truck-lettering register — condensed, heavy,
 * uppercase — with one promise, one paragraph and one ask.
 *
 * The primary action goes to CTA_HREF (/contact/), never out to the
 * scheduler; see the note on CTA_HREF in lib/routes.ts. The secondary
 * action is a dispatch line — the number set in mono under a label —
 * rather than a twin button, because two equal buttons ask the visitor
 * to choose and a phone number simply offers itself.
 *
 * Timings come from lib/motion.ts. The heading uses RevealText's masked
 * rise like every band opening; the rest cascades in at stagger.loose.
 */
import { client } from "@/client.config";
import { CTA_HREF } from "@/lib/routes";
import { stagger } from "@/lib/motion";
import { Reveal } from "./Reveal";
import { RevealText } from "./RevealText";
import { btn } from "./Button";

export function Hero() {
  const lines = client.taglineEmphasis
    ? [
        client.tagline,
        <span key="em" className="text-accent">
          {client.taglineEmphasis}
        </span>,
      ]
    : [client.tagline];

  return (
    <section id="top" className="border-b border-line bg-surface">
      <div className="section grid items-center gap-[clamp(30px,5vw,72px)] py-[clamp(56px,8vw,112px)] md:grid-cols-[1.2fr_1fr]">
        <div>
          <RevealText as="h1" lines={lines} className="max-w-[14ch] text-display-1" />

          <Reveal delay={stagger.loose}>
            <p className="mt-6 max-w-[52ch] text-lg">{client.subheadline}</p>
          </Reveal>

          <Reveal delay={stagger.loose * 2}>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
              <a href={CTA_HREF} className={btn("gold")}>
                {client.copy.heroCta}
              </a>
              <a href={`tel:${client.phoneHref}`} className="group no-underline">
                <span className="u-label block">{client.copy.heroSecondaryCta}</span>
                <span className="font-mono text-xl font-semibold tabular-nums text-ink underline-offset-4 group-hover:underline group-active:text-ink-faint">
                  {client.phone}
                </span>
              </a>
            </div>
          </Reveal>

          {/* Shop-door facts: a ruled mono line, not a stat-box band. */}
          {client.copy.heroFacts.length > 0 && (
            <Reveal delay={stagger.loose * 3}>
              <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3 border-t border-line pt-5">
                {client.copy.heroFacts.map((f) => (
                  <div key={f.label}>
                    <dt className="u-label">{f.label}</dt>
                    <dd className="m-0 mt-1 font-mono text-lg font-semibold tabular-nums text-ink">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          )}

          {client.badges.length > 0 && (
            <Reveal delay={stagger.loose * 3}>
              <p className="u-label mt-6">
                {client.badges.map((b) => b.label).join("  ·  ")}
              </p>
            </Reveal>
          )}
        </div>

        {/*
          Hero media slot.
          TODO(client): replace with a real job-site photo or video —
          drop the asset in public/brand/, swap the src, write real alt
          text. For video: <video autoPlay muted loop playsInline>.
        */}
        <Reveal variant="scale" delay={stagger.loose} className="hidden md:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/hero.svg"
            alt="" // TODO(client): describe the real photo, e.g. "Technician servicing a rooftop AC unit"
            width={480}
            height={600}
            className="aspect-[4/5] w-full rounded border border-line object-cover"
          />
        </Reveal>
      </div>
    </section>
  );
}
