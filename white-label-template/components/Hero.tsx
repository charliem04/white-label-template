"use client";

import { motion, useReducedMotion } from "framer-motion";
import { client } from "@/client.config";

export function Hero() {
  const reduce = useReducedMotion();
  const anim = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.21, 0.65, 0.36, 1] as const },
        };

  return (
    <section id="top" className="relative overflow-hidden bg-surface-alt">
      {/*
        Background media slot.
        TODO(client): replace with a real job-site photo or video —
        drop the asset in /public and swap this div for an
        <Image fill .../> or <video autoPlay muted loop playsInline>.
        Keep the overlay div for text contrast.
      */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgb(var(--brand-soft)),transparent_60%)]"
      />

      <div className="section relative grid items-center gap-10 md:grid-cols-[1.2fr_1fr] md:py-32">
        <div>
          <motion.h1
            {...anim(0)}
            className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl"
          >
            {client.tagline}
          </motion.h1>
          <motion.p {...anim(0.1)} className="mt-5 max-w-xl text-lg text-ink-soft">
            {client.subheadline}
          </motion.p>
          <motion.div {...anim(0.2)} className="mt-8 flex flex-wrap gap-3">
            <a
              href="#contact"
              className="rounded-md bg-brand px-6 py-3 font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-strong"
            >
              {client.copy.heroCta}
            </a>
            <a
              href={`tel:${client.phoneHref}`}
              className="rounded-md border border-line bg-surface px-6 py-3 font-semibold text-ink transition-all hover:-translate-y-0.5 hover:border-brand hover:text-brand"
            >
              {client.copy.heroSecondaryCta}: {client.phone}
            </a>
          </motion.div>

          {client.badges.length > 0 && (
            <motion.ul {...anim(0.3)} className="mt-10 flex flex-wrap gap-x-6 gap-y-2">
              {client.badges.map((b) => (
                <li key={b} className="flex items-center gap-1.5 text-sm text-ink-faint">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand" fill="currentColor" aria-hidden>
                    <path d="M12 2 4 5.5V11c0 5.2 3.4 9.4 8 11 4.6-1.6 8-5.8 8-11V5.5L12 2Zm-1.2 13.6-3.3-3.3 1.4-1.4 1.9 1.9 4.3-4.3 1.4 1.4-5.7 5.7Z" />
                  </svg>
                  {b}
                </li>
              ))}
            </motion.ul>
          )}
        </div>

        {/* Hero image slot — hidden on small screens where the copy is the hero */}
        <motion.div {...anim(0.15)} className="hidden md:block">
          <img
            src="/placeholder/hero.svg"
            alt="" // TODO(client): describe the real photo, e.g. "Technician servicing a rooftop AC unit"
            className="aspect-[4/5] w-full rounded-xl border border-line object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
