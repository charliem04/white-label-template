"use client";

/**
 * The application sheet.
 *
 * Six questions and a file. Every extra field on a job application
 * loses a candidate, and the roofer you most want to hear from is
 * filling this in on a phone, one-handed, in a truck.
 *
 * Two things worth not "tidying" later:
 *
 * · The file input is a real <input type="file">, not a styled drop
 *   zone. A drop zone needs a pointer, needs JavaScript to work at all,
 *   and on iOS Safari it is worse than the native picker in every way
 *   that matters. The native control is what the phone user gets.
 * · Errors are announced, not just coloured. role="alert" on the
 *   failure message and aria-invalid on the field, because a red
 *   outline says nothing to a screen reader.
 */
import { useRef, useState, type FormEvent } from "react";
import { client } from "@/client.config";
import type { Question } from "@/content/careers";
import {
  applicationsConfigured,
  checkResume,
  submitApplication,
} from "@/lib/submitApplication";
import { dialable, PHONE_NUDGE } from "@/lib/phone";
import { trackEvent } from "@/lib/tracking";
import { btn } from "./Button";
import { Turnstile } from "./Turnstile";

type Status = "idle" | "sending" | "sent" | "error";


/*
 * No outline-none here. globals.css already gives :focus-visible a 2px
 * brand outline site-wide, and replacing it with a ring on plain :focus
 * both strands keyboard users if the ring is ever dropped and paints a
 * halo on every mouse click. The border shift is an extra affordance on
 * top of that outline, not a substitute for it.
 */
const field =
  "w-full rounded border border-line bg-surface px-3.5 py-2.5 text-base text-ink " +
  "transition-colors duration-150 placeholder:text-ink-faint " +
  "focus-visible:border-brand " +
  "aria-[invalid=true]:border-danger";

export function CareersForm({
  questions,
  roles,
  resumeLabel,
  resumeHint,
}: {
  questions: Question[];
  roles: { slug: string; title: string }[];
  resumeLabel: string;
  resumeHint: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);
  const [resumeName, setResumeName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const clearInvalid = (key: string) =>
    setInvalid((v) => v.filter((k) => k !== key));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();

    const missing: string[] = [];
    if (!get("name")) missing.push("name");
    /*
     * A number nobody can ring is the same miss as a blank box on this
     * form — the office replies to an application by phone, and email
     * is optional here on purpose. So it fails the same way, and the
     * message below says which of the two it was.
     */
    const phone = get("phone");
    const badPhone = Boolean(phone) && !dialable(phone);
    if (!phone || badPhone) missing.push("phone");
    for (const q of questions) {
      if (q.required && !get(`q-${q.id}`)) missing.push(`q-${q.id}`);
    }

    const file = fileRef.current?.files?.[0] ?? null;
    const fileError = checkResume(file);
    if (fileError) missing.push("resume");

    setInvalid(missing);
    if (missing.length) {
      setStatus("error");
      // One problem gets the reason; several get the summary, because
      // naming one of four is worse than naming none.
      const only = (key: string) => missing.length === 1 && missing[0] === key;
      setError(
        fileError && only("resume")
          ? fileError
          : badPhone && only("phone")
            ? PHONE_NUDGE
            : "Please finish the highlighted fields."
      );
      document.getElementById(`field-${missing[0]}`)?.focus();
      return;
    }

    setStatus("sending");
    setError("");

    const answers: Record<string, string> = {};
    for (const q of questions) answers[q.label] = get(`q-${q.id}`);

    const result = await submitApplication({
      name: get("name"),
      phone: get("phone"),
      email: get("email"),
      role: get("role"),
      answers,
      resume: file,
      referralNote: get("referralNote"),
      turnstileToken: get("cf-turnstile-response"),
    });

    if (result.ok) {
      setStatus("sent");
      trackEvent("Form submit", { form: "careers" });
      formRef.current?.reset();
      setResumeName("");
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded border border-line bg-surface-alt p-8"
      >
        <p className="u-label">Application received</p>
        <h3 className="mt-2 text-display-3">Thanks — that reached us.</h3>
        <p className="mt-4 max-w-[52ch]">
          Someone in the office reads it and we will call if it looks like a
          fit. If you would rather chase it up, the number is{" "}
          <a href={`tel:${client.phoneHref}`} className="text-brand">
            {client.phone}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="max-w-[42rem]">
      {/* Honeypot. Off-screen rather than display:none — some bots
          skip hidden fields, and none of them use a screen reader,
          which is why it is also aria-hidden and untabbable.

          THE NAME AND LABEL MUST NOT NAME A REAL FIELD. This was
          `company`, labelled "Company", which is precisely what Chrome
          autofill matches to its "organization" category — so a
          returning visitor's browser filled it for them and this form
          discarded their application behind a success message.
          autoComplete off does not stop Chrome; not looking like a
          field it recognises does. The data- attributes cover the
          credential managers, which ignore autoComplete just as
          happily. The same rule, and the same bug, applies to the
          contact form — see components/Contact.tsx. */}
      <div aria-hidden className="absolute left-[-9999px]" tabIndex={-1}>
        <label htmlFor="field-referral-note">Referral note</label>
        <input
          id="field-referral-note"
          name="referralNote"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-protonpass-ignore="true"
          data-form-type="other"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="field-name" className="u-label mb-2 block">
            Your name
          </label>
          <input
            id="field-name"
            name="name"
            type="text"
            autoComplete="name"
            aria-invalid={invalid.includes("name")}
            onChange={() => clearInvalid("name")}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="field-phone" className="u-label mb-2 block">
            Phone
          </label>
          <input
            id="field-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            aria-invalid={invalid.includes("phone")}
            onChange={() => clearInvalid("phone")}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="field-email" className="u-label mb-2 block">
            Email <span className="normal-case">(optional)</span>
          </label>
          <input
            id="field-email"
            name="email"
            type="email"
            autoComplete="email"
            className={field}
          />
        </div>
        {roles.length > 0 && (
          <div>
            <label htmlFor="field-role" className="u-label mb-2 block">
              Which role
            </label>
            <select id="field-role" name="role" className={field}>
              <option value="">Any / not sure</option>
              {roles.map((r) => (
                <option key={r.slug} value={r.title}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5">
        {questions.map((q) => {
          const id = `field-q-${q.id}`;
          const key = `q-${q.id}`;
          const bad = invalid.includes(key);
          return (
            <div key={q.id}>
              <label htmlFor={id} className="u-label mb-2 block">
                {q.label}
                {!q.required && (
                  <span className="normal-case"> (optional)</span>
                )}
              </label>
              {q.kind === "choice" ? (
                <select
                  id={id}
                  name={key}
                  defaultValue=""
                  aria-invalid={bad}
                  aria-describedby={q.hint ? `${id}-hint` : undefined}
                  onChange={() => clearInvalid(key)}
                  className={field}
                >
                  <option value="" disabled>
                    Choose one
                  </option>
                  {q.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : q.kind === "long" ? (
                <textarea
                  id={id}
                  name={key}
                  rows={4}
                  aria-invalid={bad}
                  aria-describedby={q.hint ? `${id}-hint` : undefined}
                  onChange={() => clearInvalid(key)}
                  className={field}
                />
              ) : (
                <input
                  id={id}
                  name={key}
                  type="text"
                  aria-invalid={bad}
                  aria-describedby={q.hint ? `${id}-hint` : undefined}
                  onChange={() => clearInvalid(key)}
                  className={field}
                />
              )}
              {q.hint && (
                <p id={`${id}-hint`} className="mt-2 text-[14px] text-ink-faint">
                  {q.hint}
                </p>
              )}
            </div>
          );
        })}

        <div>
          <label htmlFor="field-resume" className="u-label mb-2 block">
            {resumeLabel}
          </label>
          <input
            ref={fileRef}
            id="field-resume"
            name="resume"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            aria-invalid={invalid.includes("resume")}
            aria-describedby="field-resume-hint"
            onChange={(e) => {
              clearInvalid("resume");
              setResumeName(e.target.files?.[0]?.name ?? "");
            }}
            className="block w-full text-[15px] text-ink-soft file:mr-4 file:rounded file:border file:border-line file:bg-surface-alt file:px-4 file:py-2.5 file:font-semibold file:text-ink hover:file:border-brand active:file:bg-brand/10"
          />
          <p id="field-resume-hint" className="mt-2 text-[14px] text-ink-faint">
            {resumeHint}
          </p>
          {resumeName && (
            <p className="mt-2 font-mono text-[13px] text-brand">
              Attached: {resumeName}
            </p>
          )}
        </div>
      </div>

      <Turnstile className="mt-6" />

      <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className={`${btn("gold")} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {status === "sending" ? "Sending…" : "Send application"}
        </button>
        {!applicationsConfigured() && (
          // Visible in dev only. In production this component is not
          // reachable, because the route stays dead until the Worker
          // is deployed — but if that ever changes, the form still
          // fails loudly rather than silently eating a résumé.
          process.env.NODE_ENV === "development" && (
            <span className="font-mono text-[12px] uppercase tracking-[0.09em] text-danger">
              Dev: NEXT_PUBLIC_CAREERS_ENDPOINT unset
            </span>
          )
        )}
      </div>

      {status === "error" && error && (
        <p
          role="alert"
          className="mt-5 rounded border border-danger bg-danger-soft px-4 py-3 text-[15px] text-ink"
        >
          {error}
        </p>
      )}
    </form>
  );
}
