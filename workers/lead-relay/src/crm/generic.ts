/**
 * ────────────────────────────────────────────────────────────────────
 *  GENERIC — the original forward, moved behind the adapter boundary
 *  and otherwise untouched.
 *
 *  Same URL, same headers, same body, same error string. This is the
 *  default and it stays the default: the thing on the far end may be a
 *  Zapier catch hook somebody wired up by hand, and a refactor of ours
 *  is not a reason for it to start receiving a different shape.
 * ────────────────────────────────────────────────────────────────────
 */

import {
  parsedAnswers,
  resumeUrl,
  type CrmAdapter,
  type CrmEnv,
  type LeadRow,
} from "./types.ts";

/**
 * Where this row goes, which depends on what it is.
 *
 * Applications prefer CRM_APPLICATION_WEBHOOK_URL and fall back to
 * the one URL, so an unset second destination is the previous
 * behaviour unchanged. Leads only ever go to CRM_WEBHOOK_URL — a
 * customer has no business in the applicant tracker.
 *
 * undefined means "nowhere is configured for this kind", which is a
 * supported state and not an error.
 */
export function destinationFor(row: LeadRow, env: CrmEnv): string | undefined {
  if (row.kind === "application" && env.CRM_APPLICATION_WEBHOOK_URL) {
    return env.CRM_APPLICATION_WEBHOOK_URL;
  }
  return env.CRM_WEBHOOK_URL;
}

/**
 * One flat JSON object, the same shape for both kinds.
 *
 * Flat because almost every CRM's inbound webhook, Zapier step and
 * no-code mapper is happier with a flat object than a nested one, and
 * the cost of flatness here is nothing — these records have no depth to
 * lose. This is the `generic` adapter's wire format and nothing else's:
 * a CRM with a real API gets shaped by its own adapter instead.
 */
export function crmPayload(row: LeadRow, env: CrmEnv = {}): Record<string, unknown> {
  return {
    id: row.id,
    type: row.kind,
    receivedAt: row.received_at,
    name: row.name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    service: row.service ?? "",
    urgency: row.urgency ?? "",
    message: row.message ?? "",
    role: row.role ?? "",
    answers: parsedAnswers(row.answers),
    // The clickable one first, because it is the one a person uses.
    // The key stays for support: it is how you find the object by hand.
    resumeUrl: resumeUrl(row, env),
    resumeKey: row.resume_key ?? "",
    source: row.source ?? "",
  };
}

export const generic: CrmAdapter = {
  id: "generic",

  configured: (env) =>
    Boolean(env.CRM_WEBHOOK_URL || env.CRM_APPLICATION_WEBHOOK_URL),

  // Both kinds, as before. The unified lead book is the point of this
  // Worker, and a webhook pointed at a spreadsheet wants the
  // applications too. The only reason to decline is having nowhere to
  // put this particular kind.
  accepts: (row, env) => Boolean(destinationFor(row, env)),

  // Never a decision, always a missing URL — so the sweep keeps these
  // rows and delivers them once one is set.
  declineReason: () => "disabled",

  async send(row, env, doFetch = fetch) {
    const url = destinationFor(row, env);
    if (!url) {
      return {
        ok: false,
        error:
          row.kind === "application"
            ? "neither CRM_APPLICATION_WEBHOOK_URL nor CRM_WEBHOOK_URL is set"
            : "CRM_WEBHOOK_URL is not set",
        spendsAttempt: false,
      };
    }
    try {
      const res = await doFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(env.CRM_AUTH_TOKEN
            ? { Authorization: `Bearer ${env.CRM_AUTH_TOKEN}` }
            : {}),
        },
        body: JSON.stringify(crmPayload(row, env)),
      });
      if (res.ok) return { ok: true };

      // The body is often where a CRM says WHY it refused, and a status
      // code alone has sent people hunting for hours.
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        error: `${res.status} ${detail.slice(0, 500)}`,
        spendsAttempt: true,
      };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        spendsAttempt: true,
      };
    }
  },
};
