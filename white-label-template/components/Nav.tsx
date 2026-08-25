"use client";

import Image from "next/image";
import { useState } from "react";
import { client } from "@/client.config";

const links = [
  { href: "#services", label: "Services" },
  { href: "#about", label: "About" },
  { href: "#booking", label: "Book online" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-3 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5">
          <Image
            src={client.logoPath}
            alt={`${client.businessName} logo`} // TODO(client): confirm alt reads well with real logo
            width={36}
            height={36}
            className="h-9 w-9"
          />
          <span className="font-display text-lg font-semibold text-ink">
            {client.businessName}
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
          <a
            href={`tel:${client.phoneHref}`}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
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
            className="mt-2 block rounded-md bg-brand px-4 py-2.5 text-center font-semibold text-white"
          >
            Call {client.phone}
          </a>
        </nav>
      )}
    </header>
  );
}
