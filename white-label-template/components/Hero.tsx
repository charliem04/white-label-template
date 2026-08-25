"use client";

import { motion, useReducedMotion } from "framer-motion";
import { client } from "@/client.config";

export function Hero() {
  const reduce = useReducedMotion();
  const anim = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay, ease: [0.21, 0.65, 0.36, 1] as const },
        };

  return (
    <section id="top" className="border-b border-line bg-surface">
      <div className="section grid items-center gap-10 md:grid-cols-[1.2fr_1fr] md:py-[96px]">
        <div>
          {/* Truck-lettering register: condensed, bold, uppercase */}
          <motion.h1
            {...anim(0)}
            className="max-w-2xl text-5xl font-bold leading-[0.95] sm:text-6xl md:text-7xl"
          >
            {client.tagline}
          </motion.h1>
          <motion.p {...anim(0.08)} className="mt-6 max-w-xl text-lg leading-relaxed">
            {client.subheadline}
          </motion.p>

          <motion.div {...anim(0.16)} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a
              href="#contact"
              className="btn-press rounded bg-brand px-7 py-3.5 text-lg font-semibold text-white hover:bg-brand-strong active:bg-brand-strong"
            >
              {client.copy.heroCta}
            </a>
            {/* Secondary action is a dispatch line, not a twin button */}
            <a href={`tel:${client.phoneHref}`} className="group">
              <span className="u-label block">{client.copy.heroSecondaryCta}</span>
              <span className="font-mono text-xl font-semibold tabular-nums text-ink underline-offset-4 group-hover:underline group-active:text-ink-faint">
                {client.phone}
              </span>
            </a>
          </motion.div>

          {client.badges.length > 0 && (
            <motion.p {...anim(0.24)} className="u-label mt-10">
              {client.badges.join("  ·  ")}
            </motion.p>
          )}
        </div>

        {/*
          Hero media slot.
          TODO(client): replace with a real job-site photo or video —
          drop the asset in /public, swap the src, write real alt text.
          For video: <video autoPlay muted loop playsInline>.
        */}
        <motion.div {...anim(0.12)} className="hidden md:block">
          <img
            src="/placeholder/hero.svg"
            alt="" // TODO(client): describe the real photo, e.g. "Technician servicing a rooftop AC unit"
            className="aspect-[4/5] w-full rounded border border-line object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
