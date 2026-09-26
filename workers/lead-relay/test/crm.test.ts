/**
 * ════════════════════════════════════════════════════════════════════
 *  WHAT CAN BE CHECKED WITHOUT A CRM.
 *
 *  There is no HubSpot account, no D1 database and no deployment at the
 *  time this is written, so the usual answer — "submit a lead and look"
 *  — is not available. What IS available is that the interesting parts
 *  of an adapter are pure or nearly so: the property mapping is a
 *  function of a row, and the delivery flow is a function of what the
 *  API answers. The fetch is injectable for exactly this reason.
 *
 *  So this file pins the things that would otherwise only be discovered
 *  in production, against a stand-in HubSpot that can be told to answer
 *  409, 429 or 401 on demand:
 *
 *  · the dedup path taken with an email, and without one
 *  · that a 409 becomes an update rather than a failed delivery
 *  · that a 429 does not spend one of the six attempts, and a refusal
 *    does
 *  · that empty fields are omitted rather than sent as "", which would
 *    erase whatever a human typed in HubSpot
 *  · that hs_lead_status is set on creation and never on update
 *  · that the generic adapter's wire format is unchanged
 *
 *  Run with `npm test`. No framework, no build step: node runs the
 *  TypeScript directly, which is why the imports carry `.ts`.
 *
 *  It is not integration testing and does not pretend to be. The first
 *  real lead through a real portal is still the moment the property
 *  names are proven — docs/HUBSPOT-SETUP.md section 5 is that check.
 * ════════════════════════════════════════════════════════════════════
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { hubspot, hubspotProperties, splitName } from "../src/crm/hubspot.ts";
import { crmPayload, generic } from "../src/crm/generic.ts";
import {
  adapterFor,
  crmConfigured,
  crmStatusFor,
  deliverableKinds,
} from "../src/crm/index.ts";
import type { LeadRow } from "../src/crm/types.ts";

const TOKEN = { CRM_ADAPTER: "hubspot", CRM_AUTH_TOKEN: "pat-test-token" };

function lead(over: Partial<LeadRow> = {}): LeadRow {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    kind: "lead",
    received_at: "2026-09-22T14:03:00.000Z",
    name: "Jordan Example",
    phone: "(337) 555-0113",
    email: "jordan@example.com",
    address: "1 Example Street, Springfield ST",
    service: "Storm damage assessment",
    urgency: null,
    message: "Water spot on the ceiling after Friday's wind.",
    role: null,
    answers: null,
    resume_key: null,
    source: "https://www.example.com/contact/",
    ...over,
  };
}

/** A stand-in HubSpot that answers whatever the test hands it, in order. */
function stub(...answers: { status: number; body?: string }[]) {
  const calls: { url: string; method: string; body: any }[] = [];
  const doFetch = async (url: any, init: any) => {
    calls.push({
      url: String(url),
      method: init?.method,
      body: init?.body ? JSON.parse(init.body) : null,
    });
    const next = answers.shift() ?? { status: 200, body: "{}" };
    return new Response(next.body ?? "{}", { status: next.status });
  };
  return { doFetch: doFetch as any, calls };
}

/* ── Mapping ────────────────────────────────────────────────────── */

test("splitName splits on the first space and keeps the rest together", () => {
  assert.deepEqual(splitName("Jordan Example"), {
    firstname: "Jordan",
    lastname: "Example",
  });
  assert.deepEqual(splitName("Mary Ann Example"), {
    firstname: "Mary",
    lastname: "Ann Example",
  });
  // One word is a first name, not a surname.
  assert.deepEqual(splitName("Jordan"), { firstname: "Jordan" });
  assert.deepEqual(splitName(null), {});
  assert.deepEqual(splitName("   "), {});
});

test("properties map to standard fields, with four site_ customs", () => {
  const props = hubspotProperties(lead(), { creating: true });
  assert.equal(props.email, "jordan@example.com");
  assert.equal(props.phone, "(337) 555-0113");
  assert.equal(props.firstname, "Jordan");
  assert.equal(props.lastname, "Example");
  assert.equal(props.address, "1 Example Street, Springfield ST");
  assert.equal(props.message, "Water spot on the ceiling after Friday's wind.");
  assert.equal(props.site_service, "Storm damage assessment");
  assert.equal(props.site_lead_id, "11111111-2222-3333-4444-555555555555");
  assert.equal(props.site_source_page, "https://www.example.com/contact/");

  // The free tier allows ten customs and the client needs some of them.
  const customs = Object.keys(props).filter((k) => k.startsWith("site_"));
  assert.ok(customs.length <= 4, `customs: ${customs.join(", ")}`);
});

test("empty fields are omitted, never sent as an empty string", () => {
  const props = hubspotProperties(
    lead({ urgency: null, message: null, source: null, address: "   " }),
    { creating: true }
  );
  for (const [key, value] of Object.entries(props)) {
    assert.notEqual(value, "", `${key} was sent as an empty string`);
  }
  assert.ok(!("site_urgency" in props));
  assert.ok(!("message" in props));
  assert.ok(!("site_source_page" in props));
  assert.ok(!("address" in props));
});

test("hs_lead_status is set on creation and never on update", () => {
  assert.equal(
    hubspotProperties(lead(), { creating: true }).hs_lead_status,
    "NEW"
  );
  assert.ok(
    !("hs_lead_status" in hubspotProperties(lead(), { creating: false })),
    "an update must not stamp NEW over a lead somebody has moved along"
  );
});

/* ── Delivery ───────────────────────────────────────────────────── */

test("a lead with an email is created in one request", async () => {
  const { doFetch, calls } = stub({ status: 201, body: '{"id":"701"}' });
  const outcome = await hubspot.send(lead(), TOKEN, doFetch);

  assert.deepEqual(outcome, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.method, "POST");
  assert.equal(calls[0]!.url, "https://api.hubapi.com/crm/v3/objects/contacts");
  assert.equal(calls[0]!.body.properties.email, "jordan@example.com");
});

test("409 is an upsert signal: it patches the contact HubSpot names", async () => {
  const { doFetch, calls } = stub(
    {
      status: 409,
      body: '{"status":"error","message":"Contact already exists. Existing ID: 701"}',
    },
    { status: 200, body: '{"id":"701"}' }
  );
  const outcome = await hubspot.send(lead(), TOKEN, doFetch);

  assert.deepEqual(outcome, { ok: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[1]!.method, "PATCH");
  assert.equal(
    calls[1]!.url,
    "https://api.hubapi.com/crm/v3/objects/contacts/701"
  );
  assert.ok(!("hs_lead_status" in calls[1]!.body.properties));
});

test("409 without an id falls back to addressing the contact by email", async () => {
  const { doFetch, calls } = stub(
    { status: 409, body: '{"message":"Contact already exists."}' },
    { status: 200, body: "{}" }
  );
  const outcome = await hubspot.send(lead(), TOKEN, doFetch);

  assert.deepEqual(outcome, { ok: true });
  assert.equal(
    calls[1]!.url,
    "https://api.hubapi.com/crm/v3/objects/contacts/jordan%40example.com?idProperty=email"
  );
});

test("no email: it searches on phone and patches the hit", async () => {
  const { doFetch, calls } = stub(
    { status: 200, body: '{"total":1,"results":[{"id":"902"}]}' },
    { status: 200, body: "{}" }
  );
  const outcome = await hubspot.send(lead({ email: null }), TOKEN, doFetch);

  assert.deepEqual(outcome, { ok: true });
  assert.equal(
    calls[0]!.url,
    "https://api.hubapi.com/crm/v3/objects/contacts/search"
  );
  assert.equal(
    calls[0]!.body.filterGroups[0].filters[0].propertyName,
    "phone"
  );
  assert.equal(calls[0]!.body.filterGroups[0].filters[0].value, "(337) 555-0113");
  assert.equal(calls[1]!.method, "PATCH");
  assert.equal(
    calls[1]!.url,
    "https://api.hubapi.com/crm/v3/objects/contacts/902"
  );
});

test("no email and no match: it creates, with no invented address", async () => {
  const { doFetch, calls } = stub(
    { status: 200, body: '{"total":0,"results":[]}' },
    { status: 201, body: '{"id":"903"}' }
  );
  const outcome = await hubspot.send(lead({ email: null }), TOKEN, doFetch);

  assert.deepEqual(outcome, { ok: true });
  assert.equal(calls[1]!.method, "POST");
  assert.ok(
    !("email" in calls[1]!.body.properties),
    "a placeholder address would pollute the client's database forever"
  );
  assert.equal(calls[1]!.body.properties.hs_lead_status, "NEW");
});

/* ── Failure ────────────────────────────────────────────────────── */

test("429 does not spend one of the six attempts", async () => {
  const { doFetch } = stub({ status: 429, body: '{"message":"rate limit"}' });
  const outcome = await hubspot.send(lead(), TOKEN, doFetch);

  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok === false && outcome.spendsAttempt, false);
  assert.match(outcome.ok === false ? outcome.error : "", /^429 /);
});

test("401 is diagnosable from the row alone, and is not transient", async () => {
  const { doFetch } = stub({ status: 401, body: '{"message":"expired"}' });
  const outcome = await hubspot.send(lead(), TOKEN, doFetch);

  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok === false && outcome.spendsAttempt, true);
  const error = outcome.ok === false ? outcome.error : "";
  assert.match(error, /NOT TRANSIENT/);
  assert.match(error, /CRM_AUTH_TOKEN/);
});

test("a refused property keeps HubSpot's own explanation", async () => {
  const { doFetch } = stub({
    status: 400,
    body: '{"message":"Property \\"site_service\\" does not exist"}',
  });
  const outcome = await hubspot.send(lead(), TOKEN, doFetch);

  assert.equal(outcome.ok, false);
  assert.match(outcome.ok === false ? outcome.error : "", /does not exist/);
  assert.equal(outcome.ok === false && outcome.spendsAttempt, true);
});

test("a network failure is an attempt, not a crash", async () => {
  const doFetch = (async () => {
    throw new TypeError("network error");
  }) as any;
  const outcome = await hubspot.send(lead(), TOKEN, doFetch);

  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok === false && outcome.spendsAttempt, true);
  assert.match(outcome.ok === false ? outcome.error : "", /network error/);
});

/* ── Which rows, and which adapter ──────────────────────────────── */

test("applications stay out of the sales CRM unless asked for", () => {
  const application = lead({ kind: "application", role: "Roofer" });
  assert.equal(hubspot.accepts(application, TOKEN), false);
  assert.equal(
    hubspot.accepts(application, { ...TOKEN, CRM_FORWARD_APPLICATIONS: "true" }),
    true
  );
  assert.equal(hubspot.accepts(lead(), TOKEN), true);
  // The generic webhook has always taken both kinds and still does.
  const hook = { CRM_WEBHOOK_URL: "https://hooks.example.test/catch" };
  assert.equal(generic.accepts(application, hook), true);
  assert.equal(generic.accepts(lead(), hook), true);
  // With no destination at all it declines — but as 'disabled', so the
  // sweep still delivers the backlog once a URL is set.
  assert.equal(generic.accepts(application, {}), false);
  assert.equal(generic.declineReason?.(application, {}), "disabled");
});

test("no token is 'not configured', not a stream of 401s", () => {
  assert.equal(hubspot.configured({ CRM_ADAPTER: "hubspot" }), false);
  assert.equal(crmConfigured({ CRM_ADAPTER: "hubspot" }), false);
  assert.equal(crmConfigured(TOKEN), true);
});

test("the default adapter is generic, and a typo is not silently one", () => {
  assert.equal(adapterFor({}), generic);
  assert.equal(adapterFor({ CRM_ADAPTER: "  HubSpot " })?.id, "hubspot");
  assert.equal(adapterFor({ CRM_ADAPTER: "hubpsot" }), null);
  assert.equal(
    crmConfigured({ CRM_ADAPTER: "hubpsot", CRM_WEBHOOK_URL: "https://x.test" }),
    false
  );
});

/* ── The generic adapter is unchanged ───────────────────────────── */

test("the generic wire format still has every field, flat", async () => {
  const payload = crmPayload(lead({ answers: '{"Years roofing":"6"}' }));
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
  assert.deepEqual(payload.answers, { "Years roofing": "6" });
  assert.equal(payload.type, "lead");
});

test("the generic adapter posts that payload with the bearer token", async () => {
  const { doFetch, calls } = stub({ status: 200, body: "ok" });
  const outcome = await generic.send(
    lead(),
    { CRM_WEBHOOK_URL: "https://hooks.example.test/catch", CRM_AUTH_TOKEN: "t" },
    doFetch
  );

  assert.deepEqual(outcome, { ok: true });
  assert.equal(calls[0]!.url, "https://hooks.example.test/catch");
  assert.equal(calls[0]!.body.name, "Jordan Example");
});

/* ── What the merge broke, pinned ───────────────────────────────── */

/*
 * Everything below covers ground a bad merge had already taken away
 * once: the résumé link, the tolerant answers parse, and a retry sweep
 * that asked CRM_WEBHOOK_URL — a variable HubSpot never sets — whether
 * there was anything to deliver.
 */

test("the sweep asks the adapter, not CRM_WEBHOOK_URL, which HubSpot never sets", () => {
  // The regression: gated on CRM_WEBHOOK_URL this was [], so a HubSpot
  // deployment swept nothing and every failed row sat forever.
  assert.deepEqual(deliverableKinds(TOKEN), ["lead"]);
  assert.deepEqual(
    deliverableKinds({ ...TOKEN, CRM_FORWARD_APPLICATIONS: "true" }),
    ["lead", "application"]
  );

  // Generic, both destinations and one.
  assert.deepEqual(
    deliverableKinds({ CRM_WEBHOOK_URL: "https://x.test" }),
    ["lead", "application"]
  );
  assert.deepEqual(
    deliverableKinds({ CRM_APPLICATION_WEBHOOK_URL: "https://x.test" }),
    ["application"]
  );

  // Nothing configured, and a misspelled adapter, sweep nothing.
  assert.deepEqual(deliverableKinds({}), []);
  assert.deepEqual(deliverableKinds({ CRM_ADAPTER: "hubpsot" }), []);
});

test("'disabled' is a backlog and 'skipped' is a decision", () => {
  const application = lead({ kind: "application", role: "Roofer" });

  // No CRM at all: both kinds wait for one.
  assert.equal(crmStatusFor(lead(), {}), "disabled");
  assert.equal(crmStatusFor(application, {}), "disabled");

  // HubSpot declines applications on purpose — that is a decision, and
  // the sweep must leave it alone.
  assert.equal(crmStatusFor(lead(), TOKEN), "pending");
  assert.equal(crmStatusFor(application, TOKEN), "skipped");
  assert.equal(
    crmStatusFor(application, { ...TOKEN, CRM_FORWARD_APPLICATIONS: "true" }),
    "pending"
  );

  // Generic with only the applicant URL set: the application goes, and
  // the lead is honestly 'disabled' rather than buried as 'skipped',
  // so setting CRM_WEBHOOK_URL later delivers it.
  const applicantsOnly = { CRM_APPLICATION_WEBHOOK_URL: "https://x.test" };
  assert.equal(crmStatusFor(application, applicantsOnly), "pending");
  assert.equal(crmStatusFor(lead(), applicantsOnly), "disabled");

  // A misspelled adapter parks rows rather than posting them anywhere.
  assert.equal(crmStatusFor(lead(), { CRM_ADAPTER: "hubpsot" }), "disabled");
});

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

test("an application forwarded to HubSpot carries its role, answers and CV", () => {
  const application = lead({
    kind: "application",
    role: "Roofer",
    message: null,
    answers: '{"Years roofing":"6"}',
    resume_key: "applications/2026/09/abc-cv.pdf",
  });
  const props = hubspotProperties(application, {
    creating: true,
    env: { RELAY_PUBLIC_ORIGIN: "https://relay.example.com" },
  });

  // Prose in a standard property, because none of this has a contact
  // field and the free tier's ten customs are the client's to spend.
  assert.match(props.message ?? "", /Role: Roofer/);
  assert.match(props.message ?? "", /Years roofing: 6/);
  assert.match(
    props.message ?? "",
    /Résumé: https:\/\/relay\.example\.com\/resume\//
  );

  // Still four customs — nothing here spent one.
  const customs = Object.keys(props).filter((k) => k.startsWith("site_"));
  assert.ok(customs.length <= 4, `customs: ${customs.join(", ")}`);

  // A lead's message is untouched: it is what the customer wrote.
  assert.equal(
    hubspotProperties(lead(), { creating: true }).message,
    "Water spot on the ceiling after Friday's wind."
  );
});
