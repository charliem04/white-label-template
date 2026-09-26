import type { ReactNode } from "react";
import { client } from "@/client.config";
import { CTA_HREF } from "@/lib/routes";
import type { CtaCopy } from "@/content/types";
import { stagger } from "@/lib/motion";
import { btn } from "./Button";
import { Reveal } from "./Reveal";
import { RevealText } from "./RevealText";
import { MoreLink } from "./MoreLink";

/**
 * One primary action sitewide: the free estimate or assessment the
 * client offers. Every page closes on this band; only the words change,
 * so the page argues for it in its own terms — the gallery says "want
 * this on your house", financing says "see what you qualify for" —
 * while the button stays the same button everywhere.
 *
 * WHICH NUMBER IT DIALS. The office, unless the page says otherwise.
 * A generic "call us" button belongs on the line staffed to answer
 * generic calls; the urgent line is answered around the clock by
 * whoever is on call for emergencies, and sending a financing question
 * there at 10pm costs the client a person's evening and trains people to use
 * the emergency line for non-emergencies.
 *
 * `line="urgent"` is for pages where the reader plausibly has water
 * coming in right now. Either way the button names the line it dials,
 * so nobody reaches an emergency number without knowing it.
 *
 * `actions` replaces the buttons entirely, for a page whose audience is
 * not a customer at all — /careers/ is the only one.
 */
export function CtaBand({
  cta,
  line = "office",
  actions,
}: {
  cta: CtaCopy;
  line?: "office" | "urgent";
  actions?: ReactNode;
}) {
  // Asking for the urgent line on a site that has none falls back to
  // the office rather than printing a label with no number under it.
  const urgent = line === "urgent" && Boolean(client.urgentPhone);
  const href = urgent ? client.urgentPhoneHref : client.phoneHref;
  const label = urgent ? "Urgent line" : "Call the office";
  const number = urgent ? client.urgentPhone : client.phone;
  return (
    <section className="on-deep band bg-brand text-ink-invert">
      <div className="section flex flex-wrap items-end justify-between gap-x-[42px] gap-y-8">
        <div className="max-w-[46ch]">
          {/* The closing ask is the last display type on the page, so it
              gets the same masked rise the band openings get rather
              than fading in as a paragraph would. */}
          <RevealText
            as="h2"
            lines={[cta.heading]}
            className="max-w-[16ch] text-display-2 text-ink-invert"
          />
          <Reveal delay={stagger.loose}>
            <p className="mt-4 text-ink-invert/85">{cta.body}</p>
          </Reveal>
        </div>
        <Reveal delay={stagger.loose * 2} className="flex flex-wrap gap-2.5">
          {actions ?? (
            <>
              <a href={CTA_HREF} className={btn("gold")}>
                {client.copy.heroCta}
              </a>
              <a href={`tel:${href}`} className={btn("lineDeep")}>
                {label} {number}
              </a>
              <MoreLink
                href="/contact/"
                tone="deep"
                className="ml-1 self-center"
              >
                Or send us the details
              </MoreLink>
            </>
          )}
        </Reveal>
      </div>
    </section>
  );
}
