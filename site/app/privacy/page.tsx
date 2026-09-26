import type { Metadata } from "next";
import { client } from "@/client.config";
import { isIndexable } from "@/lib/routes";
import { LegalPage } from "../legal";
import { robotsFor } from "@/lib/meta";

export const metadata: Metadata = {
  title: `Privacy Policy — ${client.businessName}`,
  // From the route registry, the same flag that keeps it out of the
  // sitemap — so the tag and the sitemap cannot drift apart.
  robots: robotsFor(isIndexable("/privacy/")),
};

/*
 * ════════════════════════════════════════════════════════════════════
 *  TODO(client): THIS IS A STUB. It must be written before launch.
 *
 *  Write it to describe what THIS site actually does, service by
 *  service, rather than to cover every eventuality in the abstract. A
 *  generic policy is unverifiable, and an unverifiable policy is the
 *  one that turns out to be false.
 *
 *  ── THE PROCESSORS THIS TEMPLATE'S INFRASTRUCTURE INTRODUCES ────────
 *
 *  This list IS portable — it is what the shipped code does, not what
 *  any one client does. Every item that is switched on needs a line in
 *  the policy; every item switched off must not be mentioned.
 *
 *   · Contact form → Web3Forms (lib/submitContact.ts). The submission
 *     is emailed to the office. Names, phone numbers, addresses and
 *     free text.
 *   · Lead relay → workers/lead-relay (optional,
 *     NEXT_PUBLIC_LEAD_WEBHOOK_URL). A SECOND COPY of every enquiry,
 *     stored in a Cloudflare D1 table and forwarded to whichever CRM is
 *     configured on the Worker. Name the CRM once it is chosen — it is
 *     a processor.
 *   · Résumé upload → workers/careers-upload (optional). Files in a
 *     PRIVATE R2 bucket. The careers page promises a 12-month retention
 *     and that only the business can reach the file. Both promises are
 *     enforced elsewhere: the lifecycle rule in that Worker's
 *     scripts/set-retention.sh, and the Cloudflare Access application
 *     in front of the relay's /resume/ route. If either is not set up,
 *     do not make the promise.
 *   · Turnstile (optional) → Cloudflare. A bot check on the careers
 *     form; it sets no cookie but does see the visitor's IP.
 *   · Analytics → Plausible (optional). Loads ONLY after cookie
 *     consent (components/Analytics.tsx, lib/consent.ts). Say that,
 *     because it is unusually true here and most policies claiming it
 *     are wrong.
 *   · Call tracking / DNI (optional, client.config tracking). Also
 *     consent-gated. Name the provider if one is configured.
 *   · Booking embed (optional, client.bookingUrl). An iframe: the
 *     scheduler sees the visitor directly and has its own policy. Name
 *     it with schedulerName() from lib/booking.ts — the consent gate on
 *     /contact/ does, and the two must name the same company.
 *   · Cookie consent state itself, in localStorage. Not a cookie, and
 *     worth saying so plainly rather than describing it as one.
 *
 *  If the site gains a processor later — a chat widget, a heatmap, a
 *  review feed — this page has to gain a line, or it stops being true.
 *  That is the maintenance obligation the template hands over.
 *
 *  This is not legal advice. Have the client's attorney read it before
 *  launch, and check which regime applies (GDPR, UK GDPR, CCPA/CPRA,
 *  or a state law) — the template does not know where the client is.
 * ════════════════════════════════════════════════════════════════════
 */
const EFFECTIVE = "TODO(client)";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>Effective {EFFECTIVE}</p>
      <p>
        TODO(client): this policy has not been written yet. See the
        comment in app/privacy/page.tsx for the list of processors this
        site&rsquo;s infrastructure actually introduces.
      </p>
    </LegalPage>
  );
}
