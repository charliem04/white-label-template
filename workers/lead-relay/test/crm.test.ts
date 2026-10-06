/**
 * ════════════════════════════════════════════════════════════════════
 *  WHAT CAN BE CHECKED WITHOUT A CRM.
 *
 *  There is no CRM, no D1 database and no deployment at the time this
 *  is written, so the usual answer — "submit a lead and look" — is not
 *  available. What IS available is that the interesting parts of an
 *  adapter are pure or nearly so: the payload is a function of a row,
 *  and the delivery flow is a function of what the far end answers. The
 *  fetch is injectable for exactly this reason.
 *
 *  So this file pins the things that would otherwise only be discovered
 *  in production, against a stand-in webhook that can be told to answer
 *  whatever a test needs:
 *
 *  · the generic adapter's wire format, which a hand-wired Zapier step
 *    on the far end depends on
 *  · that a refusal or a network failure spends an attempt rather than
 *    crashing the forward
 *  · which kinds the retry sweep asks for, and which rows wait
 *  · the résumé link, and the tolerant answers parse
 *
 *  Run with `npm test`. No framework, no build step: node runs the
 *  TypeScript directly, which is why the imports carry `.ts`.
 *
 *  It is not integration testing and does not pretend to be. The first
 *  real lead through the real webhook is still the check that matters.
 * ════════════════════════════════════════════════════════════════════
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { crmPayload, generic } from "../src/crm/generic.ts";
import {
  adapterFor,
  crmConfigured,
  crmStatusFor,
  deliverableKinds,
} from "../src/crm/index.ts";
import type { LeadRow } from "../src/crm/types.ts";

const HOOK = { CRM_WEBHOOK_URL: "https://hooks.example.test/catch" };

function lead(over: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    kind: "lead",
    received_at: "2026-09-22T14:03:00.000Z",
    name: "Jordan Example",
    phone: "(555) 555-0113",
    email: "jordan@example.com",
    address: "1 Example Street, Springfield ST",
    service: "Option one",
    urgency: null,
    message: "A short description of the problem.",
    role: null,
    answers: null,
    resume_key: null,
    source: "https://www.example.com/contact/",
    ...over,
  };
}

/** A stand-in webhook that answers whatever the test hands it, in order. */
function stub(...answers: { status: number; body?: string }[]) {
  const calls: { url: string; method: string; headers: any; body: any }[] = [];
  const doFetch = async (url: any, init: any) => {
    calls.push({
      url: String(url),
      method: init?.method,
      headers: init?.headers ?? {},
      body: init?.body ? JSON.parse(init.body) : null,
    });
    const next = answers.shift() ?? { status: 200, body: "{}" };
    return new Response(next.body ?? "{}", { status: next.status });
  };
  return { doFetch: doFetch as any, calls };
}

/* ── Which rows, and which adapter ──────────────────────────────── */

test("the generic webhook takes both kinds, and waits without a URL", () => {
  const application = lead({ kind: "application", role: "Technician" });
  assert.equal(generic.accepts(application, HOOK), true);
  assert.equal(generic.accepts(lead(), HOOK), true);
  // With no destination at all it declines — but as 'disabled', so the
  // sweep still delivers the backlog once a URL is set.
  assert.equal(generic.accepts(application, {}), false);
  assert.equal(generic.declineReason?.(application, {}), "disabled");
});

test("the default adapter is generic, and a typo is not silently one", () => {
  assert.equal(adapterFor({}), generic);
  assert.equal(adapterFor({ CRM_ADAPTER: "  Generic " }), generic);
  assert.equal(adapterFor({ CRM_ADAPTER: "genric" }), null);
  assert.equal(
    crmConfigured({ CRM_ADAPTER: "genric", CRM_WEBHOOK_URL: "https://x.test" }),
    false
  );
  assert.equal(crmConfigured({}), false);
  assert.equal(crmConfigured(HOOK), true);
});

/* ── The wire format ────────────────────────────────────────────── */

test("the generic wire format still has every field, flat", async () => {
  const payload = crmPayload(lead({ answers: '{"Years in the trade":"6"}' }));
  assert.deepEqual(Object.keys(payload).sort(), [
    "address",
    "answers",
    "email",
    "id",
    "message",
    "name",
    "phone",
    "receivedAt",
    "resumeKey",
    "resumeUrl",
    "role",
    "service",
    "source",
    "type",
    "urgency",
  ]);
  // NULL flattens to "" here, as it always has, and answers is parsed.
  assert.equal(payload.urgency, "");
  assert.deepEqual(payload.answers, { "Years in the trade": "6" });
  assert.equal(payload.type, "lead");
});

test("the generic adapter posts that payload with the bearer token", async () => {
  const { doFetch, calls } = stub({ status: 200, body: "ok" });
  const outcome = await generic.send(
    lead(),
    { ...HOOK, CRM_AUTH_TOKEN: "t" },
    doFetch
  );

  assert.deepEqual(outcome, { ok: true });
  assert.equal(calls[0]!.url, "https://hooks.example.test/catch");
  assert.equal(calls[0]!.headers.Authorization, "Bearer t");
  assert.equal(calls[0]!.body.name, "Jordan Example");
});

test("applications go to the applicant URL when one is set", async () => {
  const { doFetch, calls } = stub({ status: 200 }, { status: 200 });
  const env = { ...HOOK, CRM_APPLICATION_WEBHOOK_URL: "https://hooks.example.test/hiring" };

  await generic.send(lead({ kind: "application" }), env, doFetch);
  await generic.send(lead(), env, doFetch);

  assert.equal(calls[0]!.url, "https://hooks.example.test/hiring");
  assert.equal(calls[1]!.url, "https://hooks.example.test/catch");
});

/* ── Failure ────────────────────────────────────────────────────── */

test("a refusal spends an attempt and keeps the far end's explanation", async () => {
  const { doFetch } = stub({ status: 400, body: "missing field: email" });
  const outcome = await generic.send(lead(), HOOK, doFetch);

  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok === false && outcome.spendsAttempt, true);
  assert.match(outcome.ok === false ? outcome.error : "", /^400 missing field/);
});

test("a network failure is an attempt, not a crash", async () => {
  const doFetch = (async () => {
    throw new TypeError("network error");
  }) as any;
  const outcome = await generic.send(lead(), HOOK, doFetch);

  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok === false && outcome.spendsAttempt, true);
  assert.match(outcome.ok === false ? outcome.error : "", /network error/);
});

test("no URL for this kind is not an attempt", async () => {
  const outcome = await generic.send(lead(), {}, stub().doFetch);

  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok === false && outcome.spendsAttempt, false);
});

/* ── The sweep ──────────────────────────────────────────────────── */

test("the sweep asks the adapter which kinds it can deliver", () => {
  assert.deepEqual(deliverableKinds(HOOK), ["lead", "application"]);
  assert.deepEqual(
    deliverableKinds({ CRM_APPLICATION_WEBHOOK_URL: "https://x.test" }),
    ["application"]
  );

  // Nothing configured, and a misspelled adapter, sweep nothing.
  assert.deepEqual(deliverableKinds({}), []);
  assert.deepEqual(deliverableKinds({ CRM_ADAPTER: "genric" }), []);
});

test("rows with nowhere to go yet are 'disabled', a backlog", () => {
  const application = lead({ kind: "application", role: "Technician" });

  // No CRM at all: both kinds wait for one.
  assert.equal(crmStatusFor(lead(), {}), "disabled");
  assert.equal(crmStatusFor(application, {}), "disabled");

  // Configured: both are pending.
  assert.equal(crmStatusFor(lead(), HOOK), "pending");
  assert.equal(crmStatusFor(application, HOOK), "pending");

  // Only the applicant URL set: the application goes, and the lead is
  // honestly 'disabled' rather than buried as 'skipped', so setting
  // CRM_WEBHOOK_URL later delivers it.
  const applicantsOnly = { CRM_APPLICATION_WEBHOOK_URL: "https://x.test" };
  assert.equal(crmStatusFor(application, applicantsOnly), "pending");
  assert.equal(crmStatusFor(lead(), applicantsOnly), "disabled");

  // A misspelled adapter parks rows rather than posting them anywhere.
  assert.equal(crmStatusFor(lead(), { CRM_ADAPTER: "genric" }), "disabled");
});

/* ── Row helpers ────────────────────────────────────────────────── */

test("the CRM gets a résumé link, not a bare R2 object key", () => {
  const application = lead({
    kind: "application",
    resume_key: "applications/2026/09/abc-cv.pdf",
  });
  const env = { RELAY_PUBLIC_ORIGIN: "https://relay.example.com/" };

  // The trailing slash on the origin must not produce a double slash.
  assert.equal(
    crmPayload(application, env).resumeUrl,
    "https://relay.example.com/resume/11111111-2222-3333-4444-555555555555"
  );
  // The key stays alongside it, for finding the object by hand.
  assert.equal(
    crmPayload(application, env).resumeKey,
    "applications/2026/09/abc-cv.pdf"
  );
  // No origin, or no résumé: the row still forwards, just without a link.
  assert.equal(crmPayload(application, {}).resumeUrl, "");
  assert.equal(crmPayload(lead(), env).resumeUrl, "");
});

test("a non-object answers column does not strand the row forever", () => {
  // cleanAnswers() stores a plain string when what arrived did not parse
  // as an object. A bare JSON.parse here spent all six attempts and left
  // a SyntaxError where the CRM's own reason belongs.
  assert.deepEqual(crmPayload(lead({ answers: "just some text" })).answers, {
    answers: "just some text",
  });
  assert.deepEqual(crmPayload(lead({ answers: "[1,2]" })).answers, {
    answers: "[1,2]",
  });
  assert.deepEqual(crmPayload(lead({ answers: null })).answers, {});
});
