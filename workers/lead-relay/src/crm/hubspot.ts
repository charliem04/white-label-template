/**
 * ════════════════════════════════════════════════════════════════════
 *  HUBSPOT — the demo CRM.
 *
 *  HubSpot Free is what the client can be shown working this week: a
 *  real contact record, with a real lead status, created by a real form
 *  submission. It is explicitly not the final answer. A roofing CRM
 *  (JobNimbus, AccuLynx) knows what a claim, a supplement and a crew
 *  are; HubSpot does not, and pretending otherwise would be selling the
 *  wrong tool. Everything here is therefore written to be undone: one
 *  file, one variable, no trace anywhere else in the Worker.
 *
 *  Setup, scopes, the custom properties and how to verify a real lead
 *  lands: docs/HUBSPOT-SETUP.md.
 *
 *  ── WHY THE CRM OBJECTS API AND NOT THE FORMS API ───────────────────
 *
 *  The Forms API v3 is the obvious-looking choice for a form
 *  submission, and it is the wrong one here. It cannot search, so it
 *  cannot deduplicate on anything but email, and this system has rows
 *  with no email in them (see below). The Objects API can do the
 *  lookup, and an account-level bearer token drops straight into the
 *  `Authorization: Bearer …` header the relay already sends. The free
 *  allowance runs to the order of 500K requests a day, which is several
 *  orders of magnitude past a roofing contractor's lead flow.
 *
 *  That token is a SERVICE KEY. It used to be a private app token, and
 *  the two are interchangeable here — same header, same scopes, same
 *  endpoints — but HubSpot disabled private app creation for new
 *  accounts in September 2026, so a fresh portal can only issue the
 *  former. Nothing in this file depends on which one it was given;
 *  docs/HUBSPOT-SETUP.md section 2 is the runbook.
 *
 *  ── DEDUPLICATION: EMAIL FIRST, PHONE AS THE FALLBACK ───────────────
 *
 *  Email is HubSpot's own dedup key and the contact form now requires
 *  one, so that is the primary path: create, and on the 409 that means
 *  "this address is already a contact", patch the contact it names.
 *
 *  The phone fallback is not dead code waiting for a rainy day:
 *
 *  · rows already in D1 from before the form asked for an email have
 *    none, and the sweep will eventually forward them;
 *  · applications arrive through a different form whose email field is
 *    optional on purpose, and may be switched on here;
 *  · if the field is ever made optional again to reduce friction, this
 *    degrades to matching on phone instead of quietly creating a
 *    duplicate contact for every returning customer.
 *
 *  What it deliberately does NOT do is invent a synthetic address like
 *  `phone@placeholder.invalid` to force a dedup key. That pollutes the
 *  client's contact database permanently, and the day somebody sends a
 *  campaign to "all contacts" it bounces off every one of them.
 *
 *  ── WHAT IS NOT HERE ────────────────────────────────────────────────
 *
 *  No deals, no tickets, no pipelines, no associations. A contact is
 *  the smallest thing that proves the path works end to end, and every
 *  extra object type is another thing to unpick when the real CRM
 *  arrives.
 * ════════════════════════════════════════════════════════════════════
 */

import {
  forwardsApplications,
  parsedAnswers,
  resumeUrl,
  type CrmAdapter,
  type CrmEnv,
  type CrmOutcome,
  type FetchLike,
  type LeadRow,
} from "./types.ts";

const CONTACTS = "https://api.hubapi.com/crm/v3/objects/contacts";

/**
 * The search endpoint is rate-limited far more tightly than the rest of
 * the CRM API — on the order of four requests a second, against ~190
 * per ten seconds for everything else. Irrelevant at one lead at a
 * time, which is all this Worker ever does. It matters if somebody
 * later batches the retry sweep, so: that is the limit to design
 * around, and 429 is already handled as "try again later" below.
 */
const SEARCH = `${CONTACTS}/search`;

/* ── Mapping ────────────────────────────────────────────────────── */

/**
 * "Jordan Example" → firstname "Jordan", lastname "Example".
 *
 * Split on the FIRST space, so "Mary Ann Example" keeps
 * "Ann Example" together as the surname. That is wrong for some
 * names and right for more of them than any cleverer rule, and the
 * whole string survives either way — nothing is dropped, only
 * distributed. A single word goes to firstname, because "Jordan" as a
 * surname reads as a filing error to whoever opens the record.
 */
export function splitName(name: string | null): {
  firstname?: string;
  lastname?: string;
} {
  const full = (name ?? "").trim();
  if (!full) return {};
  const cut = full.indexOf(" ");
  if (cut === -1) return { firstname: full };
  return {
    firstname: full.slice(0, cut),
    lastname: full.slice(cut + 1).trim(),
  };
}

/**
 * Everything an application carries that a contact record has no box
 * for, as prose for the standard `message` property.
 *
 * A job application is a role, a questionnaire and a CV. None of those
 * is a contact property, and none is worth spending one of the ten
 * free custom properties on — HubSpot is where this system's
 * applications go only when somebody explicitly switches
 * CRM_FORWARD_APPLICATIONS on, and it is the wrong tool for them even
 * then. Prose in a field that certainly exists beats a 400 naming a
 * property that does not, and beats an applicant arriving as a bare
 * name and phone number, which is what happened before this.
 *
 * The résumé link is the part that matters: without it the record says
 * somebody applied and gives no way to read what they sent.
 */
function applicationNotes(row: LeadRow, env: CrmEnv): string {
  const lines: string[] = [];
  const note = (label: string, value: string | null) => {
    const v = (value ?? "").trim();
    if (v) lines.push(`${label}: ${v}`);
  };

  note("Role", row.role);
  note("Message", row.message);
  for (const [question, answer] of Object.entries(parsedAnswers(row.answers))) {
    note(question, typeof answer === "string" ? answer : JSON.stringify(answer));
  }
  note("Résumé", resumeUrl(row, env) || null);

  return lines.join("\n");
}

/**
 * A lead row as HubSpot contact properties.
 *
 * Pure, and exported for exactly that reason: it is the part of this
 * adapter that can be checked without a HubSpot account, and test/
 * checks it.
 *
 * ── ON STANDARD VS CUSTOM PROPERTIES ────────────────────────────────
 *
 * The free tier caps custom properties at ten, and the client will
 * want some of that budget for how they actually work. So everything
 * that has a standard home gets one — email, phone, firstname,
 * lastname, address, and `message`, which is a standard contact
 * property HubSpot ships for precisely this ("what did they write in
 * the form"). That leaves four customs, named with a `site_` prefix so
 * they are obviously ours in a property list: service, urgency, the
 * D1 row id and the page it came from. Six of the ten stay free.
 *
 * Empty values are omitted rather than sent as "". The schema treats
 * NULL ("this form does not ask") as different from empty, and writing
 * "" into HubSpot would erase a value a human may have typed there.
 */
export function hubspotProperties(
  row: LeadRow,
  opts: { creating: boolean; env?: CrmEnv }
): Record<string, string> {
  const props: Record<string, string> = {};
  const put = (key: string, value: string | null | undefined) => {
    const v = (value ?? "").trim();
    if (v) props[key] = v;
  };

  const { firstname, lastname } = splitName(row.name);

  put("email", row.email);
  put("phone", row.phone);
  put("firstname", firstname);
  put("lastname", lastname);
  put("address", row.address);
  put(
    "message",
    row.kind === "application"
      ? applicationNotes(row, opts.env ?? {})
      : row.message
  );

  put("site_service", row.service);
  put("site_urgency", row.urgency);
  // The most recent submission's row id, not the first. A returning
  // customer overwrites it, which is the right trade: this field is for
  // "which D1 row produced what I am looking at", and D1 plus
  // /export.csv keep the full history either way.
  put("site_lead_id", row.id);
  put("site_source_page", row.source);

  /*
   * NEW on creation only. It gives the demo a real pipeline state
   * rather than a blank column — but on an update somebody may have
   * moved this person to Open, In progress or Unqualified, and
   * stamping NEW back over that would undo a salesperson's work every
   * time the same customer asked for something.
   */
  if (opts.creating) props.hs_lead_status = "NEW";

  return props;
}

/* ── One call ───────────────────────────────────────────────────── */

type Call = { ok: boolean; status: number; body: string };

async function call(
  doFetch: FetchLike,
  url: string,
  method: "POST" | "PATCH",
  token: string,
  payload: unknown
): Promise<Call> {
  const res = await doFetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  // Always read the body: on a failure it is the only place HubSpot
  // says which property it did not like, and on a search it is the
  // answer.
  const body = await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, body };
}

/**
 * A refusal, classified.
 *
 * The status alone decides whether this is worth retrying, and the
 * body — truncated, because crm_error is a column and not a log —
 * decides whether a human can tell what happened without reproducing
 * it. HubSpot's errors are structured and genuinely useful: "Property
 * site_service does not exist" is the difference between a five-minute
 * fix and an afternoon.
 */
function refusal(res: Call): CrmOutcome {
  const body = res.body.slice(0, 500);

  if (res.status === 429) {
    // Not a rejection. The sweep will come back in fifteen minutes,
    // and this must not cost one of the six attempts.
    return {
      ok: false,
      error: `429 throttled by HubSpot, will retry — ${body}`,
      spendsAttempt: false,
    };
  }

  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      error:
        `${res.status} HubSpot rejected the token — NOT TRANSIENT. The ` +
        `service key in CRM_AUTH_TOKEN is wrong, rotated, from another ` +
        `portal, or missing the crm.objects.contacts scopes. Retrying will ` +
        `not fix it; see docs/HUBSPOT-SETUP.md. — ${body}`,
      spendsAttempt: true,
    };
  }

  return { ok: false, error: `${res.status} ${body}`, spendsAttempt: true };
}

/* ── The two paths ──────────────────────────────────────────────── */

/** `{"message":"Contact already exists. Existing ID: 701"}` → "701". */
function existingIdFrom(body: string): string | null {
  const match = /Existing ID:\s*(\d+)/i.exec(body);
  return match?.[1] ?? null;
}

/** The id of the first search hit, if there was one. */
function firstMatchFrom(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { results?: { id?: unknown }[] };
    const id = parsed.results?.[0]?.id;
    return typeof id === "string" ? id : typeof id === "number" ? String(id) : null;
  } catch {
    return null;
  }
}

async function patch(
  doFetch: FetchLike,
  url: string,
  row: LeadRow,
  token: string,
  env: CrmEnv
): Promise<CrmOutcome> {
  const res = await call(doFetch, url, "PATCH", token, {
    properties: hubspotProperties(row, { creating: false, env }),
  });
  return res.ok ? { ok: true } : refusal(res);
}

/**
 * Create, and treat HubSpot's duplicate conflict as an upsert signal.
 *
 * A 409 here is not a failure — it is HubSpot telling us this person is
 * already a contact, and naming them. Recording that as a failed
 * delivery would leave the office chasing a "CRM error" that is
 * actually a returning customer, and the retry would 409 five more
 * times before giving up on a lead that never needed retrying.
 */
async function createOrPatch(
  doFetch: FetchLike,
  row: LeadRow,
  token: string,
  env: CrmEnv
): Promise<CrmOutcome> {
  const created = await call(doFetch, CONTACTS, "POST", token, {
    properties: hubspotProperties(row, { creating: true, env }),
  });
  if (created.ok) return { ok: true };
  if (created.status !== 409) return refusal(created);

  const id = existingIdFrom(created.body);
  if (id) return patch(doFetch, `${CONTACTS}/${id}`, row, token, env);

  // No id in the message — HubSpot's wording is not a contract. The
  // email itself is a unique id as far as the API is concerned, so
  // address the contact by it instead.
  if (row.email) {
    return patch(
      doFetch,
      `${CONTACTS}/${encodeURIComponent(row.email)}?idProperty=email`,
      row,
      token,
      env
    );
  }
  return refusal(created);
}

/**
 * No email on the row, so ask HubSpot whether it already knows this
 * number before creating anything.
 *
 * Worth knowing when a duplicate shows up anyway: this is an exact
 * string match on the stored value. "(337) 555-0113" and "3375550113"
 * are two different contacts to HubSpot, and the relay stores whatever
 * the visitor typed. HubSpot's own phone normalisation helps on
 * records it has formatted, not on the raw string we search with.
 */
async function matchOnPhone(
  doFetch: FetchLike,
  row: LeadRow,
  token: string,
  env: CrmEnv
): Promise<CrmOutcome> {
  const phone = (row.phone ?? "").trim();
  // Intake refuses a record with neither a phone nor an email, so this
  // is unreachable from the routes — but a row is a row, and creating
  // the contact beats dropping it silently.
  if (!phone) return createOrPatch(doFetch, row, token, env);

  const found = await call(doFetch, SEARCH, "POST", token, {
    filterGroups: [
      { filters: [{ propertyName: "phone", operator: "EQ", value: phone }] },
    ],
    properties: ["email"],
    limit: 1,
  });
  if (!found.ok) return refusal(found);

  const id = firstMatchFrom(found.body);
  if (id) return patch(doFetch, `${CONTACTS}/${id}`, row, token, env);
  return createOrPatch(doFetch, row, token, env);
}

/* ── The adapter ────────────────────────────────────────────────── */

export const hubspot: CrmAdapter = {
  id: "hubspot",

  // The token is the whole configuration. No portal id, no account id:
  // the token names the portal it belongs to.
  configured: (env) => Boolean(env.CRM_AUTH_TOKEN),

  // Leads always; applications only when explicitly switched on. See
  // CRM_FORWARD_APPLICATIONS in ./types.ts for why that is the default.
  accepts: (row, env) => row.kind === "lead" || forwardsApplications(env),

  async send(row, env, doFetch = fetch) {
    const token = env.CRM_AUTH_TOKEN;
    if (!token) {
      return {
        ok: false,
        error: "CRM_AUTH_TOKEN is not set",
        spendsAttempt: false,
      };
    }
    try {
      // Email first, because it is HubSpot's own dedup key and one
      // request covers the common case of a new customer.
      return row.email
        ? await createOrPatch(doFetch, row, token, env)
        : await matchOnPhone(doFetch, row, token, env);
    } catch (e) {
      // A network failure, not a refusal. Same treatment as the
      // generic adapter: it costs an attempt and the sweep tries again.
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        spendsAttempt: true,
      };
    }
  },
};
