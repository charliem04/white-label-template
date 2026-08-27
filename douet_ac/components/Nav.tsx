"use client";

import Image from "next/image";
import { useState } from "react";
import { client } from "@/client.config";

const links = [
  { href: "#services", label: "Services" },
  { href: "#about", label: "About" },
  { href: "#booking", label: "Book online" },
  { href: "#contact", label: "Estimate" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    // Solid ground + hairline rule. No translucency, no blur.
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-3 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <Image
            src={client.logoPath}
            alt={`${client.businessName} logo`} // TODO(client): confirm alt reads well with real logo
            width={34}
            height={34}
            className="h-8 w-8"
          />
          {/* deliberate-ignore flat-type-scale — a nav bar is legitimately narrow-range; the page-level scale runs 11px to 72px */}
          <span className="font-display text-xl font-bold uppercase tracking-wide text-ink">
            {client.businessName}
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline active:text-ink-faint"
            >
              {l.label}
            </a>
          ))}
          {/* The dispatch line is the point of the site — mono, ink, unmissable */}
          <a
            href={`tel:${client.phoneHref}`}
            className="btn-press rounded border border-ink px-4 py-2 font-mono text-sm font-semibold tabular-nums text-ink hover:bg-ink hover:text-surface active:bg-ink-soft"
          >
            {client.phone}
          </a>
        </nav>

        <button
          className="p-2 md:hidden"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-ink" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-line bg-surface px-5 pb-4 pt-2 md:hidden" aria-label="Main mobile">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-base font-medium text-ink"
            >
              {l.label}
            </a>
          ))}
          <a
            href={`tel:${client.phoneHref}`}
            className="btn-press mt-2 block rounded bg-brand px-4 py-2.5 text-center font-semibold text-white hover:bg-brand-strong active:bg-brand-strong"
          >
            Call {client.phone}
          </a>
        </nav>
      )}
    </header>
  );
}
