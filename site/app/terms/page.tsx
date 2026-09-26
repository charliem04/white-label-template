import type { Metadata } from "next";
import { client } from "@/client.config";
import { isIndexable } from "@/lib/routes";
import { LegalPage } from "../legal";
import { robotsFor } from "@/lib/meta";

export const metadata: Metadata = {
  title: `Terms of Service — ${client.businessName}`,
  // From the route registry, the same flag that keeps it out of the
  // sitemap — so the tag and the sitemap cannot drift apart.
  robots: robotsFor(isIndexable("/terms/")),
};

/*
 * ════════════════════════════════════════════════════════════════════
 *  TODO(client): THIS IS A STUB. It must be written before launch.
 *
 *  The wiring above is the portable part and is already correct: the
 *  noindex directive is read from the route registry, so this page
 *  stays out of the sitemap and out of search from one flag.
 *
 *  The prose is not portable and was deliberately NOT carried over from
 *  the site this template came from. Terms describing a roofing
 *  contractor's claims role on a dentist's website are worse than no
 *  terms at all.
 *
 *  ── WHAT THESE TERMS MUST COVER, AND WHAT THEY MUST NOT ─────────────
 *
 *  Cover: what the site is, that quoted prices and availability are
 *  indicative until confirmed in writing, intellectual property in the
 *  photographs, the limitation of liability for the website itself, and
 *  which jurisdiction governs.
 *
 *  Do NOT let these terms speak for the work. The signed scope of work
 *  governs the job, and nothing a visitor reads here should be capable
 *  of contradicting it. Keep that separation explicit — it is the one
 *  structural decision worth carrying between clients.
 *
 *  This is not legal advice. Have the client's attorney read it before
 *  launch.
 * ════════════════════════════════════════════════════════════════════
 */
const EFFECTIVE = "TODO(client)";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>Effective {EFFECTIVE}</p>
      <p>
        TODO(client): these terms have not been written yet. See the
        comment in app/terms/page.tsx for what they have to cover.
      </p>
    </LegalPage>
  );
}
