import { client } from "@/client.config";

/**
 * ════════════════════════════════════════════════════════════════════
 *  APPLICATION SUBMIT — the one request in this site that carries a file.
 *
 *  Everything else here is a static export talking to a third-party
 *  form service over JSON. A résumé cannot go that way: there is no
 *  server to receive multipart, and the contact form's JSON path
 *  cannot carry a file.
 *
 *  So this posts to a Cloudflare Worker — workers/careers-upload in
 *  this repo — which validates the upload and writes it to a private
 *  R2 bucket. Set the deployed URL in:
 *
 *      NEXT_PUBLIC_CAREERS_ENDPOINT
 *
 *  Unset, the form refuses to submit and points the applicant at the
 *  office email instead. That is the same rule the contact form
 *  follows and it matters more here, not less: somebody applying for a
 *  job has spent real effort on that document, and a form that appears
 *  to accept it and drops it costs them a job they think they applied
 *  for.
 *
 *  ── WHAT IS VALIDATED WHERE ─────────────────────────────────────────
 *
 *  The checks below are for the applicant's benefit — instant feedback
 *  instead of a round trip. They are NOT security. Every one of them is
 *  repeated in the Worker, which is the only side that counts, because
 *  anything running in a browser can be skipped by not using a browser.
 * ════════════════════════════════════════════════════════════════════
 */

export type ApplicationPayload = {
  name: string;
  phone: string;
  email: string;
  /** Which role, or "" when they are applying generally. */
  role: string;
  /** Questionnaire answers, question → answer. */
  answers: Record<string, string>;
  resume: File | null;
  /**
   * Honeypot — must be empty; bots fill it.
   *
   * Deliberately not named after anything a browser recognises. See the
   * field's markup in components/CareersForm.tsx for why that matters.
   */
  referralNote?: string;
  /** Cloudflare Turnstile token, when the widget is configured. */
  turnstileToken?: string;
};

export type SubmitResult = { ok: true } | { ok: false; error: string };

const ENDPOINT = process.env.NEXT_PUBLIC_CAREERS_ENDPOINT ?? "";

/** Keep in step with MAX_UPLOAD_BYTES in workers/careers-upload. */
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

/**
 * PDF and .docx only. Legacy .doc is refused deliberately, here and in
 * the Worker: it is the OLE macro format, nothing in the pipeline scans
 * these files, and the person who would carry that risk is whoever in
 * the office double-clicks the attachment.
 */
export const ACCEPTED_EXTENSIONS = [".pdf", ".docx"] as const;
const REFUSED_EXTENSIONS = [".doc", ".docm", ".dotm", ".rtf", ".pages"] as const;

const EMAIL_INSTEAD = `We couldn't send that. Please email your résumé to ${client.email} instead — we don't want you to lose the application.`;

export function applicationsConfigured(): boolean {
  return ENDPOINT.length > 0;
}

/** Client-side only. The Worker re-checks all of this. */
export function checkResume(file: File | null): string | null {
  if (!file) return "Please attach your résumé.";
  if (file.size === 0) return "That file looks empty. Try attaching it again.";
  if (file.size > MAX_RESUME_BYTES) {
    return "That file is over 5MB. Please attach a smaller PDF or Word document.";
  }
  const lower = file.name.toLowerCase();
  const refused = REFUSED_EXTENSIONS.find((ext) => lower.endsWith(ext));
  if (refused) {
    // Say what to do, not just what went wrong — plenty of good roofers
    // have a résumé their cousin typed up in Word in 2011.
    return `We can't accept ${refused} files. Please save it as a PDF and try again — in Word that is File, Save As, PDF.`;
  }
  if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
    return "Please attach a PDF or a .docx Word document.";
  }
  return null;
}

export async function submitApplication(
  payload: ApplicationPayload
): Promise<SubmitResult> {
  /*
   * Honeypot: report success so bots learn nothing, send nothing.
   *
   * A false positive here costs somebody a job they believe they
   * applied for — this file's own header is about exactly that — so it
   * says so in development, where somebody is watching. Never in
   * production: the silence there is the entire mechanism.
   */
  if (payload.referralNote) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[careers] honeypot field is not empty — this application was " +
          "DISCARDED and no résumé was uploaded. If you did not type in " +
          "it, something is filling it for you (browser autofill, a " +
          "password manager, an extension). That is a bug, not a caught " +
          "bot: see components/CareersForm.tsx."
      );
    }
    return { ok: true };
  }

  const fileError = checkResume(payload.resume);
  if (fileError) return { ok: false, error: fileError };

  if (!ENDPOINT) {
    console.error(
      "[careers] NEXT_PUBLIC_CAREERS_ENDPOINT is not set — the upload Worker is not wired up, so this application was not delivered."
    );
    return { ok: false, error: EMAIL_INSTEAD };
  }

  const body = new FormData();
  body.append("name", payload.name);
  body.append("phone", payload.phone);
  body.append("email", payload.email);
  body.append("role", payload.role);
  // One JSON blob rather than a field per question, so adding a
  // question to content/careers.ts needs no change here or in the Worker.
  body.append("answers", JSON.stringify(payload.answers));
  body.append("resume", payload.resume as File);
  if (payload.turnstileToken) {
    body.append("cf-turnstile-response", payload.turnstileToken);
  }

  try {
    // No Content-Type header: the browser must set the multipart
    // boundary itself, and setting it by hand produces a body the
    // Worker cannot parse.
    const res = await fetch(ENDPOINT, { method: "POST", body });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;

    if (!res.ok || data?.ok !== true) {
      console.error("[careers] upload rejected:", res.status, data);
      return { ok: false, error: data?.error || EMAIL_INSTEAD };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Couldn't reach the server. Check your connection and try again, or email it to us.",
    };
  }
}
