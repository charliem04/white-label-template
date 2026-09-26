"use client";

/**
 * ════════════════════════════════════════════════════════════════════
 *  THE SCHEDULER, embedded rather than linked — the plan's point being
 *  that bouncing someone to a booking site mid-decision loses the ones
 *  who were only half sure.
 *
 *  This band, on /contact/, is the only part of the site that reaches
 *  Calendly. Every CTA elsewhere points at the page rather than at the
 *  calendar (see CTA_HREF in lib/routes.ts), so a visitor arrives here
 *  having chosen to book rather than having been sent.
 *
 *  It does not load on arrival. The scheduler is a third party that
 *  sets its own cookies, so the iframe goes in when the visitor asks —
 *  either because they already accepted cookies, or because they
 *  pressed the button on this panel, which is consent for this one
 *  embed and nothing else. Anyone who would rather not can still use
 *  the direct link, the phone, or the form below.
 *
 *  ── WHY IT USED TO FEEL SLOW, AND WHAT CHANGED ──────────────────────
 *
 *  The iframe carried `loading="lazy"`, which sounds like the right
 *  answer and was the wrong one here. The booking band sits well down
 *  /contact/, so for a visitor who had already accepted cookies the
 *  browser deferred the whole embed until they had very nearly scrolled
 *  to it — and then started a DNS lookup, a TCP handshake, a TLS
 *  negotiation and a document fetch, all while they sat looking at the
 *  empty box. The lazy attribute did not make the calendar slow to
 *  load; it made it start loading at the last possible moment, which
 *  the visitor experiences as the same thing.
 *
 *  So the work is moved earlier rather than made smaller, in two steps:
 *
 *    1. As soon as the embed is allowed, open the connection to
 *       the scheduler. DNS, TCP and TLS are the fixed cost of talking to
 *       a new origin, and none of it needs to wait for a scroll.
 *    2. About a third of a screen out, mount the iframe and let it
 *       fetch over the connection that is already warm.
 *
 *  A visitor who has not allowed it gets neither, until they reach for
 *  the button — a pointer arriving on it opens the connection, so the
 *  handshake is usually finished by the time the click lands.
 *
 *  ── AND WHY THE PRECONNECT IS NOT IN THE HEAD ───────────────────────
 *
 *  A <link rel="preconnect"> in the document head would be simpler and
 *  faster still, and it would open a connection to a third party for
 *  every visitor who ever lands on this page — including the ones who
 *  decline cookies and the ones who never scroll this far. That
 *  contradicts the rest of the page's posture, so it is not done. Every
 *  path to warmScheduler() runs behind either consent or a deliberate
 *  reach for the button.
 * ════════════════════════════════════════════════════════════════════
 */
import { useEffect, useRef, useState } from "react";
import { client } from "@/client.config";
import { getConsent, CONSENT_EVENT } from "@/lib/consent";
import { bookingOrigins, bookingEmbedSrc, schedulerName } from "@/lib/booking";
import { btn } from "./Button";

/** Close enough that the visitor means to use it. */
const MOUNT_MARGIN = "300px";

/**
 * The scheduler URL, widened to string.
 *
 * client.config.ts is `as const`, so with booking switched off the
 * literal type of client.bookingUrl is "" and TypeScript narrows every
 * guarded use of it to `never` — correct about today's config, useless
 * to a component written to work either way. Reading it through one
 * widened binding keeps the code honest about what it handles without
 * loosening the config's types for everyone else.
 */
const bookingUrl: string = client.bookingUrl;

/**
 * Open connections to the scheduler without asking it for anything yet.
 *
 * The origins come from lib/booking.ts rather than being written out
 * here, so the preconnects always point at what the iframe is about to
 * fetch — a hardcoded host quietly warms the wrong one the first time
 * the scheduler changes.
 *
 * Idempotent per origin, and it has to be: /contact/ also preconnects
 * from an inline script before this file has even downloaded, so by
 * the time this runs the links are usually already there. It can also
 * be reached from a hover, a focus and an observer inside the same
 * second. Re-appending would be litter in the head, not a second
 * connection.
 */
function warmScheduler() {
  if (typeof document === "undefined") return;

  for (const origin of bookingOrigins()) {
    if (document.head.querySelector(`link[data-booking-warm="${origin}"]`)) {
      continue;
    }
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    // The iframe document is fetched as a cross-origin navigation, so
    // the connection has to be opened in anonymous mode to be reused.
    link.crossOrigin = "anonymous";
    link.setAttribute("data-booking-warm", origin);
    document.head.appendChild(link);
  }
}

export function BookingEmbed() {
  /** The visitor has allowed this embed — by cookie consent or by button. */
  const [allowed, setAllowed] = useState(false);
  /** Scrolled close enough to mount the iframe. */
  const [near, setNear] = useState(false);
  /** The scheduler has actually painted, so the skeleton can go. */
  const [ready, setReady] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bookingUrl) return;
    const check = () => {
      if (getConsent() === "accepted") setAllowed(true);
    };
    check();
    window.addEventListener(CONSENT_EVENT, check);
    return () => window.removeEventListener(CONSENT_EVENT, check);
  }, []);

  /* ── Warm the connection the moment the embed is allowed ─────────
     Consent is the gate, so once it exists there is nothing left to
     wait for: opening the socket early is the entire saving, and the
     visitor on /contact/ with the calendar allowed is going to use it.

     This was an observer on a 900px root margin, which was measured
     and thrown away — the booking band sits about 360px below the fold
     on a 900px viewport, so a margin that size fired on page load
     anyway while reading as though it waited for something. Doing it
     plainly is the same behaviour with none of the pretence, and it
     leaves the whole scroll distance between the handshake and the
     fetch instead of an arbitrary 600px of it.

     It is inside the `allowed` gate and must stay there. Warming
     unconditionally would open a connection to a third party for a
     visitor who has just declined cookies, which is the one thing this
     component exists to avoid. Somebody who has not decided gets a
     connection only if they reach for the button. */
  useEffect(() => {
    if (allowed) warmScheduler();
  }, [allowed]);

  /* ── Mount on approach ───────────────────────────────────────────
     Disconnects on the first hit; the answer cannot change back. */
  useEffect(() => {
    if (!bookingUrl) return;
    const el = boxRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer: mount on arrival rather than never. The embed is
      // still behind the consent gate, which is the part that matters.
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: MOUNT_MARGIN },
    );
    io.observe(el);
    return () => io.disconnect();
    // Re-observes when the gate opens, because the element the ref
    // points at is a different one on each side of it.
  }, [allowed]);

  if (!bookingUrl) return null;

  if (!allowed) {
    return (
      <div
        ref={boxRef}
        className="rounded border border-dashed border-line bg-surface p-8 text-center"
      >
        <p className="u-label">Booking calendar</p>
        {/* Named, not "a scheduling service": consent to a third party
            the visitor cannot identify is not consent, and /privacy/
            names the same one — both read schedulerName() from
            lib/booking.ts, so swapping bookingUrl renames it in both. */}
        <p className="mx-auto mt-3 max-w-[46ch]">
          The calendar is hosted by {schedulerName()}, which sets its own cookies.
          Load it here, or open it in a new tab — your choice.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setAllowed(true)}
            // The pointer arriving on the button is the earliest honest
            // signal there is. By the time the click lands the
            // handshake is usually done, so the iframe's first request
            // goes out on an open connection.
            onPointerEnter={warmScheduler}
            onFocus={warmScheduler}
            className={btn("gold")}
          >
            Load the calendar
          </button>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            onPointerEnter={warmScheduler}
            className={btn("line")}
          >
            Open {schedulerName()} instead
          </a>
        </div>
      </div>
    );
  }

  // An iframe rather than the scheduler's widget script: same flow,
  // no third-party JavaScript running in the page's own context.
  const src = bookingEmbedSrc();

  return (
    <div
      ref={boxRef}
      className="relative h-[760px] w-full overflow-hidden rounded border border-line bg-surface md:h-[700px]"
    >
      {/* ── The wait ────────────────────────────────────────────────
          The box is drawn at full size before anything arrives in it,
          so the band never changes height and nothing below it moves
          when the calendar paints.

          What fills it is the shape of the thing being fetched, not a
          line of text in the middle of 760px of nothing. The scheduler
          is a third party on someone else's servers and some of that
          wait is not ours to remove; a rectangle that already looks
          like a month of dates reads as nearly-here, where an empty
          bordered box reads as broken and gets a reload — which
          genuinely does make it slower, because the reload throws away
          the connection this component spent the whole page opening.

          Marked aria-hidden and paired with an sr-only line: a screen
          reader should hear that the calendar is loading, not a grid
          of forty empty cells. */}
      {!ready && (
        <div className="absolute inset-0 p-8" aria-busy>
          {/* The pulse is the only signal that a third-party request is
              in flight, and it stops when the calendar lands.
              deliberate-ignore decorative-motion */}
          <div className="animate-pulse" aria-hidden>
            <div className="h-3 w-40 rounded bg-line" />
            <div className="mt-8 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={`d${i}`} className="h-2 rounded bg-line/60" />
              ))}
              {Array.from({ length: 35 }, (_, i) => (
                <div key={i} className="aspect-square rounded bg-line/40" />
              ))}
            </div>
          </div>
          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.09em] text-ink-faint">
            Loading the booking calendar…
          </p>
        </div>
      )}

      {near && (
        <iframe
          src={src}
          title={`Book a free assessment with ${client.businessName}`}
          // Deliberately NOT lazy. Reaching this line already means the
          // visitor allowed the embed and is within a third of a screen
          // of it; deferring again is the behaviour this component was
          // rewritten to remove.
          loading="eager"
          onLoad={() => setReady(true)}
          className={`absolute inset-0 h-full w-full transition-opacity duration-200 ease-out ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}
