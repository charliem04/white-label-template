import type { Metadata } from "next";
import { client } from "@/client.config";
import { LegalPage } from "../legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${client.businessName}`,
  robots: { index: false },
};

/*
 * ⚠️ REPLACE BEFORE LAUNCH ⚠️
 * Generic starter policy — NOT legal advice. Review and replace before
 * launch. Keep it accurate: if you enable analytics or the lead
 * webhook, the disclosures below must reflect what actually runs.
 */
export default function PrivacyPage() {
  const effective = "____________"; // TODO(client): set effective date

  return (
    <LegalPage title="Privacy Policy">
      <p className="rounded border border-line bg-surface-alt p-4 text-sm font-medium">
        ⚠️ REPLACE BEFORE LAUNCH — this is generic starter text, not legal
        advice. Review with the business owner or their attorney.
      </p>
      <p>Effective date: {effective}</p>
      <p>
        This Privacy Policy describes how {client.legalName} ("we," "us," or
        "our") collects and uses information when you use this website.
      </p>
      <h2>Information you provide</h2>
      <p>
        When you submit our contact form or book an appointment, we collect
        the information you enter — typically your name, phone number, email
        address, and a description of the work you need. We use it to respond
        to your request, schedule service, and communicate with you about your
        job, including by phone, email, or text message.
      </p>
      <h2>Information collected automatically</h2>
      <p>
        With your consent, we use privacy-focused analytics to understand
        aggregate site usage (pages visited, referral source). No analytics
        scripts load unless you accept cookies via the consent banner.
      </p>
      <h2>Service providers</h2>
      <p>
        Form submissions and booking requests are processed by third-party
        service providers acting on our behalf (for example, a form delivery
        service, a scheduling provider, and a lead-management system). These
        providers process your information only to deliver those services.
      </p>
      <h2>Sharing</h2>
      <p>
        We do not sell your personal information. We share it only with the
        service providers described above or when required by law.
      </p>
      <h2>Retention and your choices</h2>
      <p>
        We keep contact and job information as long as needed for business and
        legal purposes. You may ask us to correct or delete your information
        by contacting us at {client.email}.
      </p>
      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. The effective date above
        reflects the latest revision.
      </p>
      <h2>Contact</h2>
      <p>
        Privacy questions: {client.email} or {client.phone}.
      </p>
    </LegalPage>
  );
}
