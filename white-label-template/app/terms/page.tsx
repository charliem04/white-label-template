import type { Metadata } from "next";
import { client } from "@/client.config";
import { LegalPage } from "../legal";

export const metadata: Metadata = {
  title: `Terms of Service — ${client.businessName}`,
  robots: { index: false },
};

/*
 * ⚠️ REPLACE BEFORE LAUNCH ⚠️
 * Generic starter terms — NOT legal advice. Have the client (or their
 * attorney) review and replace before the site goes live. The config
 * values fill in automatically, but the substance below is boilerplate.
 */
export default function TermsPage() {
  const effective = "____________"; // TODO(client): set effective date

  return (
    <LegalPage title="Terms of Service">
      <p className="rounded border border-line bg-surface-alt p-4 text-sm font-medium">
        ⚠️ REPLACE BEFORE LAUNCH — this is generic starter text, not legal
        advice. Review with the business owner or their attorney.
      </p>
      <p>Effective date: {effective}</p>
      <p>
        These Terms of Service ("Terms") govern your use of the website
        operated by {client.legalName} ("we," "us," or "our"). By accessing or
        using this website, you agree to these Terms.
      </p>
      <h2>Use of the site</h2>
      <p>
        This website provides information about our services and lets you
        contact us or request appointments. You agree to use the site only for
        lawful purposes and to provide accurate information when submitting
        forms or booking requests.
      </p>
      <h2>Estimates and services</h2>
      <p>
        Information on this site, including service descriptions and any
        pricing references, is provided for general information and does not
        constitute a binding offer. All work is subject to a written estimate
        or agreement provided separately.
      </p>
      <h2>Appointments</h2>
      <p>
        Online booking requests are requests only until confirmed by us. We
        may reschedule or decline a request and will make reasonable efforts
        to notify you promptly.
      </p>
      <h2>Intellectual property</h2>
      <p>
        The content on this site, including text, images, and logos, belongs
        to {client.legalName} or its licensors and may not be reproduced
        without permission.
      </p>
      <h2>Disclaimer and limitation of liability</h2>
      <p>
        This website is provided "as is" without warranties of any kind. To
        the fullest extent permitted by law, {client.legalName} is not liable
        for any indirect, incidental, or consequential damages arising from
        your use of the site.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of the site
        after changes take effect constitutes acceptance of the revised Terms.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about these Terms: {client.email} or {client.phone}.
      </p>
    </LegalPage>
  );
}
