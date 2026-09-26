/**
 * ────────────────────────────────────────────────────────────────────
 *  WHICH ADAPTER, AND WHETHER THERE IS ONE.
 *
 *  Adding a CRM is a file next to this one and a line in ADAPTERS.
 *  Nothing else in the Worker learns its name.
 * ────────────────────────────────────────────────────────────────────
 */

import { generic } from "./generic.ts";
import { hubspot } from "./hubspot.ts";
import type { CrmAdapter, CrmEnv, LeadKind, LeadRow } from "./types.ts";

export type {
  CrmAdapter,
  CrmEnv,
  CrmOutcome,
  LeadKind,
  LeadRow,
} from "./types.ts";

export { parsedAnswers, resumeUrl } from "./types.ts";

const ADAPTERS: Record<string, CrmAdapter> = {
  [generic.id]: generic,
  [hubspot.id]: hubspot,
};

/**
 * The configured adapter, or null when CRM_ADAPTER names one that does
 * not exist.
 *
 * Null rather than a silent fallback to `generic`: a typo would
 * otherwise send every lead at whatever CRM_WEBHOOK_URL holds, which
 * for a half-configured deployment is nothing, and for a
 * half-reconfigured one is the CRM being migrated away from. Null
 * means rows are stored 'disabled' — captured, forwarded by the sweep
 * the moment the spelling is fixed, and loud in the log meanwhile.
 */
export function adapterFor(env: CrmEnv): CrmAdapter | null {
  const id = (env.CRM_ADAPTER ?? "").trim().toLowerCase() || generic.id;
  const adapter = ADAPTERS[id];
  if (!adapter) {
    console.error(
      `[relay] CRM_ADAPTER="${id}" is not one of: ${Object.keys(ADAPTERS).join(
        ", "
      )}. Nothing is being forwarded — rows are stored 'disabled' and the ` +
        "sweep will deliver the backlog once this is corrected."
    );
    return null;
  }
  return adapter;
}

/** Whether this deployment can forward anything at all right now. */
export function crmConfigured(env: CrmEnv): boolean {
  const adapter = adapterFor(env);
  return Boolean(adapter && adapter.configured(env));
}

/**
 * The delivery state a row is born with, and the one the sweep reads
 * back. The single place that decision is made.
 *
 * 'pending'  there is a CRM and it wants this row
 * 'skipped'  there is a CRM, and not taking this row is a decision —
 *            an application with CRM_FORWARD_APPLICATIONS off. The
 *            sweep leaves these alone forever, so switching that
 *            variable on does not backfill by itself.
 * 'disabled' there is nowhere to send this row yet, or CRM_ADAPTER is
 *            misspelled. The sweep delivers these the moment there is.
 *
 * The difference between the last two is the whole reason
 * declineReason() exists on the contract: both mean "not sent", and
 * only one of them is a backlog.
 */
export function crmStatusFor(row: LeadRow, env: CrmEnv): string {
  const adapter = adapterFor(env);
  if (!adapter || !adapter.configured(env)) return "disabled";
  if (adapter.accepts(row, env)) return "pending";
  return adapter.declineReason?.(row, env) ?? "skipped";
}

/**
 * The kinds the configured adapter can deliver right now.
 *
 * The retry sweep asks for these and nothing else. Without the filter
 * its batch of 25 fills with rows forward() will decline to send — if
 * only CRM_APPLICATION_WEBHOOK_URL is set, every 'disabled' lead ever
 * captured sorts ahead of the applications by received_at and starves
 * them, sweep after sweep, while the table looks busy.
 *
 * It asks the ADAPTER rather than reading CRM_WEBHOOK_URL, because
 * that env var is the generic adapter's destination and nobody else's.
 * HubSpot never sets it, so a sweep gated on it would return no kinds
 * and silently never retry anything — which is the one guarantee this
 * Worker exists to make.
 */
export function deliverableKinds(env: CrmEnv): LeadKind[] {
  const adapter = adapterFor(env);
  if (!adapter || !adapter.configured(env)) return [];

  // accepts() takes a row, and both adapters read only `kind` off it.
  // A probe row keeps that an implementation detail of the adapter
  // rather than a second, drifting copy of the same rule here.
  return (["lead", "application"] as LeadKind[]).filter((kind) =>
    adapter.accepts(probeRow(kind), env)
  );
}

/** The emptiest possible row of a given kind, for deliverableKinds(). */
function probeRow(kind: LeadKind): LeadRow {
  return {
    id: "",
    kind,
    received_at: "",
    name: null,
    phone: null,
    email: null,
    address: null,
    service: null,
    urgency: null,
    message: null,
    role: null,
    answers: null,
    resume_key: null,
    source: null,
  };
}
