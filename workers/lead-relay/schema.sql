-- ════════════════════════════════════════════════════════════════════
--  THE LEAD BOOK.
--
--  One table, holding both halves of "somebody got in touch": a request
--  for an assessment from the contact form, and an application for a
--  job from the careers form. They are different enough to argue for
--  two tables and similar enough that one is easier to look at, and
--  looking at it is the entire point — this exists so the office has a
--  single list rather than two inboxes.
--
--  ── WHY A DATABASE AND NOT JUST A FORWARD ───────────────────────────
--
--  A relay that only forwards is a relay that loses everything the CRM
--  was not awake for. The row is written BEFORE the forward is
--  attempted and never depends on it succeeding, so an outage at the
--  far end costs a delivery rather than a lead, and the retry has
--  something to retry from.
--
--  Apply with `npm run schema`. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leads (
  -- UUID minted by the Worker. Returned to the caller so a submission
  -- can be traced from a browser console to a row to a CRM record.
  id            TEXT PRIMARY KEY,

  -- 'lead' (contact form) or 'application' (careers form).
  kind          TEXT NOT NULL,

  -- ISO 8601, UTC, set by the Worker. Not a client value: a timestamp
  -- a caller can choose is a timestamp that can be backdated.
  received_at   TEXT NOT NULL,

  -- Everything either form collects. Sparse by design — a job
  -- application has no service or urgency, an assessment request has no
  -- role or résumé — and NULL here means "this form does not ask",
  -- which is different from empty.
  name          TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  service       TEXT,
  urgency       TEXT,
  message       TEXT,
  role          TEXT,
  answers       TEXT,          -- JSON object, question -> answer
  resume_key    TEXT,          -- R2 object key; the file stays in R2

  -- The page it was submitted from, for attribution.
  source        TEXT,

  -- Delivery state, which is about the CRM and not about the lead.
  -- 'pending'  written, not yet forwarded
  -- 'sent'     the CRM accepted it
  -- 'failed'   the CRM refused or was unreachable; the retry will pick it up
  -- 'disabled' no CRM is configured yet, so there is nothing to send to
  -- 'skipped'  a CRM is configured and this row is not one it takes — a
  --            job application, with CRM_FORWARD_APPLICATIONS off. A
  --            decision, not a backlog: the retry sweep leaves these
  --            alone, so switching that variable on does not backfill by
  --            itself. To send them anyway:
  --              UPDATE leads SET crm_status='pending'
  --               WHERE crm_status='skipped';
  crm_status    TEXT NOT NULL DEFAULT 'pending',
  crm_attempts  INTEGER NOT NULL DEFAULT 0,
  crm_error     TEXT,
  crm_sent_at   TEXT
);

-- The two questions actually asked of this table: "what came in
-- recently" and "what still has not reached the CRM".
CREATE INDEX IF NOT EXISTS leads_received_idx ON leads (received_at DESC);
CREATE INDEX IF NOT EXISTS leads_crm_status_idx ON leads (crm_status, received_at);
