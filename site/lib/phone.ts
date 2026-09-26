/**
 * ════════════════════════════════════════════════════════════════════
 *  Is this a number somebody can ring back?
 *
 *  Both forms on this site ask for a phone number and both are useless
 *  without one that works: the assessment request is returned by phone,
 *  and so is the job application. So the rule lives here once rather
 *  than in each form, where two copies would drift and only one of them
 *  would be the one anybody tested.
 *
 *  ── WHY DIGITS AND NOT A PATTERN ────────────────────────────────────
 *
 *  It counts digits and ignores everything else. These are the same
 *  number and all of them pass:
 *
 *      3375550113        (337) 555-0113       337-555-0113
 *      337.555.0113      +1 337 555 0113      (337)555-0113 ext 22
 *
 *  A format check would reject some of those, and arguing with somebody
 *  about how they write their own phone number loses a lead for
 *  nothing. This is a reachability check, not a validator — the same
 *  rule the email check in Contact.tsx follows, for the same reason.
 *
 *  ── WHY TEN AND FIFTEEN ─────────────────────────────────────────────
 *
 *  Ten is the floor because that is a number the office can dial.
 *  Seven — a local number with no area code — is one nobody can return
 *  from a CRM record a week later, and it is the most common way a real
 *  enquiry arrives unreachable.
 *
 *  Fifteen is the ceiling because E.164 caps a phone number there. It
 *  leaves room for a country code and an extension without accepting a
 *  paragraph, and it rejects the other common miss: two numbers pasted
 *  into one box, where the office rings a digit soup and gives up.
 *
 *  Neither bound tries to decide whether the number is *real*. Only the
 *  office calling it can learn that, which it does anyway.
 * ════════════════════════════════════════════════════════════════════
 */

export const PHONE_MIN_DIGITS = 10;
export const PHONE_MAX_DIGITS = 15;

/** Whether this is enough of a phone number to ring back. */
export function dialable(value: string): boolean {
  const digits = value.replace(/\D/g, "").length;
  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

/**
 * What to say when somebody filled the box and it still is not a number.
 *
 * It names the fix rather than the rule. "Include the area code" is the
 * actual miss in nearly every case; "must be between 10 and 15 digits"
 * is true, useless, and reads like a form yelling at you.
 */
export const PHONE_NUDGE =
  "That doesn’t look like a full phone number — include the area code.";
