/**
 * Provider-agnostic contact submit.
 *
 * The form component calls submitContact(data) and knows nothing about
 * where the data goes. To change providers, change env vars — not
 * markup:
 *
 *   NEXT_PUBLIC_FORM_ENDPOINT    Formspree URL, a Cloudflare Worker
 *                                that relays via Resend, or any HTTP
 *                                endpoint accepting JSON POST.
 *   NEXT_PUBLIC_LEAD_WEBHOOK_URL Optional. Fired in parallel — point
 *                                at the Speed-to-Lead intake webhook
 *                                for clients on the automation add-on.
 *
 * The webhook is fire-and-forget: a webhook failure never blocks the
 * customer-facing success state as long as the primary endpoint
 * succeeded.
 */

export type ContactPayload = {
  name: string;
  phone: string;
  email: string;
  /** Which job — one of client.form.serviceOptions */
  service: string;
  /** How soon — one of client.form.urgencyOptions */
  urgency: string;
  /** Free-text detail; optional on the form */
  message: string;
  /** honeypot — must be empty; bots fill it */
  company?: string;
};

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string };

const FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? "";
const WEBHOOK_URL = process.env.NEXT_PUBLIC_LEAD_WEBHOOK_URL ?? "";

export async function submitContact(
  payload: ContactPayload
): Promise<SubmitResult> {
  // Honeypot: silently succeed so bots don't learn they were caught.
  if (payload.company) return { ok: true };

  if (!FORM_ENDPOINT) {
    // Template default: no endpoint configured yet.
    console.warn(
      "[contact] NEXT_PUBLIC_FORM_ENDPOINT is not set — form is in demo mode."
    );
    return { ok: true };
  }

  const body = JSON.stringify({
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    service: payload.service,
    urgency: payload.urgency,
    message: payload.message,
    source: typeof window !== "undefined" ? window.location.href : "",
    submittedAt: new Date().toISOString(),
  });

  // Fire the lead webhook in parallel; never await it into the UX path.
  if (WEBHOOK_URL) {
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    }).catch((e) => console.warn("[contact] lead webhook failed:", e));
  }

  try {
    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: "Something went wrong sending your message. Please call us instead.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the server. Check your connection and try again, or call us.",
    };
  }
}
