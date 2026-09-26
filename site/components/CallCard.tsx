"use client";

/**
 * What a phone number does when there is no phone.
 *
 * Every call button on this site is a real `tel:` link, and on a phone
 * that is exactly right — one tap and it dials. On a desktop it depends
 * entirely on whether that machine has a handler registered. Plenty do
 * (Skype, Teams, Google Voice, a Mac paired to an iPhone) and those
 * visitors should keep the one-click dial they already have. The rest
 * get either nothing at all or the operating system's "no app is set to
 * open this link" dialog — a dead click at the exact moment someone
 * decided to make contact, and the ugliest thing on the page.
 *
 * So on a desktop this intercepts the click and opens a small card
 * instead: the number large enough to read across a desk, a copy
 * button, and the two routes that cannot fail — the scheduler and the
 * form. A visitor who does have a dialer can still use it from the card.
 *
 * ── WHY THIS IS ONE DELEGATED LISTENER, NOT A <CallLink> COMPONENT ───
 * There are 23 phone links across 15 files. Wrapping each one is 23
 * edits that must be repeated by whoever adds the 24th, and the day
 * someone forgets is the day a dead click ships. This is the same
 * reasoning — and the same mechanism — as InteractionTracking, which
 * sits beside it in the layout for the same reason.
 * ────────────────────────────────────────────────────────────────────
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────
 * It does not stop propagation. InteractionTracking is listening on the
 * same document for the same click, and a desktop visitor opening this
 * card is a Call intent that belongs in the numbers exactly like a
 * mobile tap does. preventDefault cancels the navigation; the event
 * still reaches the tracker.
 *
 * It does not rewrite any href. The markup stays a real phone link, so
 * it is still right-clickable, still copyable, still announced as a
 * phone number by a screen reader, and still correct with JavaScript
 * off — which is the state this file is a progressive enhancement over.
 *
 * It does not offer `sms:` here. Texting is the right second option on
 * a phone and the sticky bar carries it, but `sms:` fails on a desktop
 * for the same reason `tel:` does, and a fallback whose fallback is
 * broken is worse than no fallback.
 * ────────────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { client } from "@/client.config";
import { CTA_HREF } from "@/lib/routes";

/** Which of the two lines was clicked; they are answered differently. */
type Line = {
  href: string;
  label: string;
  number: string;
  /** The line's own promise about when it is answered. */
  hours: string;
};

/**
 * A desktop is a machine with a mouse, not a wide window. Width would
 * catch a phone in landscape and miss a small laptop; `pointer: fine`
 * with `hover` is asking the question actually being asked — is there a
 * cursor here — and it is the same question that decides whether the
 * OS is likely to have a dialer at all.
 */
const DESKTOP = "(hover: hover) and (pointer: fine)";

/** Only digits, so a formatted number and its bare digits compare equal. */
const digits = (s: string) => s.replace(/\D/g, "");

function lineFor(href: string): Line {
  const dialled = digits(href);
  return client.urgentPhoneHref && dialled === digits(client.urgentPhoneHref)
    ? {
        href: client.urgentPhoneHref,
        label: "Urgent line",
        number: client.urgentPhone,
        hours: "Answered around the clock",
      }
    : {
        href: client.phoneHref,
        label: "Call the office",
        number: client.phone,
        hours: client.hoursShort,
      };
}

export function CallCard() {
  const [line, setLine] = useState<Line | null>(null);
  const [copied, setCopied] = useState(false);

  const copyRef = useRef<HTMLButtonElement>(null);
  const bookRef = useRef<HTMLAnchorElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const numberRef = useRef<HTMLParagraphElement>(null);
  /** The link that opened the card, so focus can go back where it was. */
  const openerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setLine(null);
    setCopied(false);
    openerRef.current?.focus();
    openerRef.current = null;
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // A modified click is a deliberate "open this elsewhere" and is
      // not ours to interpret. Neither is a middle or right button.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      const href = anchor?.getAttribute("href");
      if (!anchor || !href?.startsWith("tel:")) return;

      // The card is the desktop's consolation prize. A phone already
      // has the better answer and keeps it.
      if (!window.matchMedia(DESKTOP).matches) return;

      // The one link inside the card that is meant to reach the dialer.
      if (anchor.dataset.dial === "true") return;

      e.preventDefault();
      openerRef.current = anchor;
      setCopied(false);
      setLine(lineFor(href.slice(4)));
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Keyboard and scroll behaviour while the card is open, kept to the
  // same contract as the gallery lightbox: Escape closes, Tab cycles
  // the card's own controls, the page underneath does not scroll.
  useEffect(() => {
    if (!line) return;
    copyRef.current?.focus();
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const ring = [copyRef.current, bookRef.current, closeRef.current].filter(
        (el): el is HTMLButtonElement & HTMLAnchorElement => Boolean(el)
      );
      const i = ring.indexOf(document.activeElement as never);
      e.preventDefault();
      ring[(i + (e.shiftKey ? -1 : 1) + ring.length) % ring.length]?.focus();
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [line, close]);

  // The confirmation is a receipt, not a state: it says the copy
  // happened and then gets out of the way.
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  if (!line) return null;

  /**
   * Clipboard access is refused on insecure origins and by some
   * privacy settings. Rather than report a failure nobody can act on,
   * fall back to selecting the number so the visitor's own Ctrl+C
   * works — the outcome they were after either way.
   */
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(line.number);
      setCopied(true);
    } catch {
      const node = numberRef.current;
      if (!node) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${line.label} — ${line.number}`}
      className="on-deep fixed inset-0 z-50 flex items-center justify-center bg-surface-deep/85 p-[clamp(14px,4vw,48px)]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {/*
        The card sits on the deep ground the rest of the site's bands
        use, and the accent does the pointing: a rule across the top, the
        number itself, the action, the links. It is the accent-on-deep
        pairing the alert bands use, at card scale.

        surface-deep-alt rather than surface-deep, because the scrim
        behind it is surface-deep: the raised tone is what stops the
        card dissolving into its own backdrop. That is the token's
        stated job — "raised dark surface" (app/globals.css).
      */}
      <div className="w-full max-w-[420px] rounded border border-line-dark/20 border-t-4 border-t-accent bg-surface-deep-alt p-7">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-mono text-[12px] font-medium uppercase tracking-[0.09em] text-accent">
            {line.label}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-2 -mt-2 rounded border border-transparent px-2 py-1 text-ink-invert-soft transition-colors duration-150 hover:border-line-dark/25 hover:text-ink-invert active:bg-ink-invert/10"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* The number is the reason the card exists, so it is the
            largest thing in it and the one thing wearing the action
            colour — set in the mono tabular register every other figure
            on the site uses, and selectable. The accent is re-declared
            light inside the deep ground (globals.css) and measures
            about 5:1 on surface-deep-alt in the template skin, so
            carrying meaning on it is safe. Re-check after a re-skin. */}
        <p
          ref={numberRef}
          className="mt-3 select-all font-mono text-[clamp(28px,3.4vw,34px)] font-semibold tabular-nums text-accent"
        >
          {line.number}
        </p>
        <p className="mt-1.5 text-[15px] text-ink-invert-soft">{line.hours}</p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            ref={copyRef}
            type="button"
            onClick={copy}
            aria-live="polite"
            className="inline-flex items-center justify-center gap-2 rounded border border-accent-press bg-accent px-[26px] py-[15px] text-base font-semibold text-accent-ink transition-colors duration-150 hover:bg-accent-lift active:translate-y-px active:bg-accent-press"
          >
            {copied ? "Copied" : "Copy number"}
          </button>
          <a
            ref={bookRef}
            href={CTA_HREF}
            className="inline-flex items-center justify-center gap-2 rounded border border-line-dark/20 bg-transparent px-[26px] py-[15px] text-base font-semibold text-ink-invert no-underline transition-colors duration-150 hover:border-accent hover:bg-accent/10 hover:text-accent active:translate-y-px active:bg-accent/20"
          >
            Book a time
          </a>
        </div>

        {/* Two routes that cannot fail, and — on its own line, because
            it is the one option most visitors here have already been
            failed by — the call this click originally asked for, for
            the desktop that does have a dialer after all. `data-dial`
            is what stops the listener above from catching its own link
            and reopening the card. */}
        <div className="mt-6 border-t border-line-dark/20 pt-4 text-[15px] text-ink-invert-soft">
          <p>
            <a
              href={`mailto:${client.email}`}
              className="text-accent no-underline underline-offset-2 transition-colors duration-150 hover:underline active:text-accent-press"
            >
              {client.email}
            </a>
            <span className="px-2 text-line-dark/35">·</span>
            <a
              href="/contact/"
              className="text-accent no-underline underline-offset-2 transition-colors duration-150 hover:underline active:text-accent-press"
            >
              Send us the details
            </a>
          </p>
          <p className="mt-2">
            <a
              href={`tel:${line.href}`}
              data-dial="true"
              className="text-[13px] text-ink-invert-soft/70 no-underline underline-offset-2 transition-colors duration-150 hover:text-ink-invert-soft hover:underline active:text-accent"
            >
              Dial from this computer
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
