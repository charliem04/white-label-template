"use client";

/**
 * The request sheet — the work order a trades shop actually writes on.
 * Six fields and a note: an estimate request is a phone call waiting to
 * happen, not an intake questionnaire, so the form asks only what a
 * dispatcher needs to make contact and triage: who, what number, where
 * to write when the phone goes unanswered, which property, what job,
 * and how soon.
 *
 * Urgency is a required pick rather than a free-text line because it is
 * the field the dispatcher sorts by. "Emergency — ASAP" and "just
 * planning ahead" are different callbacks on different days, and a
 * dropdown makes the visitor choose instead of leaving it to be guessed
 * from the note.
 *
 * Both contact routes are required. The dispatcher calls first, so the
 * number is what starts the job — but the quote, the photo set and the
 * insurance scope all travel by email, and a lead with no address to
 * send them to stalls on the second call instead of the first.
 */
import { useState, type FormEvent } from "react";
import { client } from "@/client.config";
import { CTA_HREF } from "@/lib/routes";
import { dialable, PHONE_NUDGE } from "@/lib/phone";
import { contactConfigured, submitContact } from "@/lib/submitContact";
import { trackEvent } from "@/lib/tracking";
import { Reveal } from "./Reveal";
import { SectionHead } from "./SectionHead";
import { btn } from "./Button";

type Status = "idle" | "sending" | "sent" | "error";

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  address: "",
  service: client.form.serviceOptions[0],
  // Starts blank on purpose: a pre-selected urgency is a default the
  // visitor never chose, and the dispatcher cannot tell the difference.
  urgency: "",
  message: "",
  referralNote: "", // honeypot — see the field markup for the naming rule
};

const REQUIRED = ["name", "phone", "email", "address", "urgency"] as const;

/*
 * A typo check, not a validator. Anything stricter starts refusing
 * addresses that work, and the only way to learn an inbox exists is to
 * send to it — which the office does anyway when it follows up.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROBLEM: Record<string, string> = {
  name: "Enter your name so we know who to ask for.",
  phone: "Enter a phone number we can reach you on.",
  address: "Enter the address of the property.",
  email: "Enter an email address — it’s where the quote and photos go.",
  urgency: "Pick how soon you need us, so we call back in the right order.",
};

/** Filled in, but not usable. A different miss needs a different nudge. */
const MALFORMED: Record<string, string> = {
  email: "That email address doesn’t look right — check it over.",
  phone: PHONE_NUDGE,
};

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);
  const [form, setForm] = useState<Record<string, string>>(EMPTY);

  const set = (key: string) => (e: { target: { value: string } }) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (value.trim()) setInvalid((v) => v.filter((k) => k !== key));
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // A slow network invites a second press, and a double-submitted
    // enquiry is two calls to the same person from two people.
    if (status === "sending") return;
    const problems: string[] = REQUIRED.filter((key) => !form[key].trim());
    // Blank is already caught above; this is the filled-in box that
    // cannot be an address — a lead the office would silently fail to
    // reach, which is worse than one that never typed anything.
    const email = form.email.trim();
    if (email && !EMAIL.test(email)) problems.push("email");
    // Same shape, same reason: a number we cannot dial is a lead the
    // office cannot chase, and it fails later and more expensively than
    // it does here.
    const phone = form.phone.trim();
    if (phone && !dialable(phone)) problems.push("phone");
    setInvalid(problems);
    if (problems.length) {
      document.getElementById(`field-${problems[0]}`)?.focus();
      return;
    }

    setStatus("sending");
    setError("");
    const result = await submitContact({
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      service: form.service,
      urgency: form.urgency,
      message: form.message,
      referralNote: form.referralNote,
    });
    if (result.ok) {
      setStatus("sent");
      setForm(EMPTY);
      trackEvent("Form submit", { service: form.service, urgency: form.urgency });
    } else {
      setError(result.error);
      setStatus("error");
    }
  }

  const field =
    "w-full rounded border bg-surface px-3.5 py-3 text-base text-ink " +
    "transition-colors duration-150 placeholder:text-ink-faint hover:border-brand-soft focus:border-brand active:border-brand";
  const tone = (key: string) =>
    invalid.includes(key) ? "border-danger bg-danger-soft" : "border-line";
  const problem = (key: string) =>
    invalid.includes(key) ? (
      <span className="mt-1.5 block text-sm text-danger">
        {(form[key]?.trim() && MALFORMED[key]) || PROBLEM[key]}
      </span>
    ) : null;

  return (
    <section id="contact" className="band bg-surface-alt">
      <div className="section grid gap-[clamp(30px,5vw,72px)] md:grid-cols-[1.05fr_0.95fr]">
        <div>
          <SectionHead
            heading={client.copy.contactHeading}
            lede={client.copy.contactLede}
          />

          <Reveal delay={0.06}>
            <form onSubmit={onSubmit} noValidate className="mt-10">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="u-label mb-1.5 block">Your name</span>
                  <input
                    id="field-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    value={form.name}
                    onChange={set("name")}
                    aria-invalid={invalid.includes("name")}
                    className={`${field} ${tone("name")}`}
                  />
                  {problem("name")}
                </label>

                <label className="block">
                  <span className="u-label mb-1.5 block">Phone</span>
                  <input
                    id="field-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={30}
                    value={form.phone}
                    onChange={set("phone")}
                    aria-invalid={invalid.includes("phone")}
                    className={`${field} ${tone("phone")} font-mono tabular-nums`}
                  />
                  {problem("phone")}
                </label>
              </div>

              <label className="mt-4 block">
                <span className="u-label mb-1.5 block">Email</span>
                <input
                  id="field-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={160}
                  value={form.email}
                  onChange={set("email")}
                  aria-invalid={invalid.includes("email")}
                  className={`${field} ${tone("email")}`}
                />
                {problem("email")}
              </label>

              <label className="mt-4 block">
                <span className="u-label mb-1.5 block">Property address</span>
                <input
                  id="field-address"
                  name="address"
                  type="text"
                  autoComplete="street-address"
                  maxLength={160}
                  value={form.address}
                  onChange={set("address")}
                  aria-invalid={invalid.includes("address")}
                  className={`${field} ${tone("address")}`}
                />
                {problem("address")}
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="u-label mb-1.5 block">What do you need?</span>
                  <select
                    name="service"
                    value={form.service}
                    onChange={set("service")}
                    className={`${field} ${tone("service")} cursor-pointer`}
                  >
                    {client.form.serviceOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="u-label mb-1.5 block">How soon?</span>
                  <select
                    id="field-urgency"
                    name="urgency"
                    value={form.urgency}
                    onChange={set("urgency")}
                    aria-invalid={invalid.includes("urgency")}
                    // An unchosen select sits at placeholder weight, like
                    // an unfilled blank on the sheet.
                    className={`${field} ${tone("urgency")} ${form.urgency ? "" : "text-ink-faint"} cursor-pointer`}
                  >
                    <option value="" disabled>
                      Choose one
                    </option>
                    {client.form.urgencyOptions.map((u) => (
                      <option key={u} value={u} className="text-ink">
                        {u}
                      </option>
                    ))}
                  </select>
                  {problem("urgency")}
                </label>
              </div>

              <label className="mt-4 block">
                <span className="u-label mb-1.5 block">Anything we should know</span>
                <textarea
                  name="message"
                  rows={4}
                  maxLength={2000}
                  value={form.message}
                  onChange={set("message")}
                  placeholder="Describe what you are seeing, and roughly when it started…"
                  className={`${field} ${tone("message")} resize-none`}
                />
              </label>

              {/*
                Honeypot — off-screen rather than display:none, because a
                bot that renders CSS skips a hidden field but fills this
                one. Anything in it makes submitContact drop the
                submission.

                THE NAME AND LABEL MUST NOT NAME A REAL FIELD. This was
                `company` with the label "Company", which is exactly what
                Chrome's autofill matches to its "organization" category —
                so a returning visitor's browser filled it for them and
                the form silently discarded a real lead. `autoComplete`
                off does not stop Chrome; only not looking like a field it
                recognises does. The data- attributes cover the credential
                managers, which have their own opt-outs and ignore
                autoComplete just as happily.
              */}
              <label className="absolute -left-[9999px]" aria-hidden tabIndex={-1}>
                Referral note
                <input
                  name="referralNote"
                  tabIndex={-1}
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-bwignore="true"
                  data-protonpass-ignore="true"
                  data-form-type="other"
                  value={form.referralNote}
                  onChange={set("referralNote")}
                />
              </label>

              <button type="submit" disabled={status === "sending"} className={`mt-6 ${btn("gold")} disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-alt disabled:text-ink-faint`}>
                {status === "sending" ? "Sending…" : client.copy.contactSubmit}
              </button>

              {process.env.NODE_ENV === "development" && !contactConfigured() && (
                // Dev only. In production the form still fails loudly
                // rather than swallowing a lead, but the visitor gets
                // "call us", not a configuration note.
                <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.09em] text-danger">
                  Dev: NEXT_PUBLIC_WEB3FORMS_KEY is unset — this form will refuse
                </p>
              )}

              {/* The calendar itself, not the scheduler it embeds. This
                  form renders on the home page and on /contact/, so the
                  anchor both travels to the booking band and scrolls up
                  to it when the visitor is already there. */}
              {client.bookingUrl && (
                <p className="mt-4 text-sm text-ink-faint">
                  Prefer to pick your own time?{" "}
                  <a
                    href={`${CTA_HREF}#booking`}
                    className="border-b-2 border-accent text-ink no-underline transition-colors duration-150 hover:text-brand active:text-brand-strong"
                  >
                    Book directly on the calendar
                  </a>
                  .
                </p>
              )}

              <p role="status" aria-live="polite">
                {status === "sent" && (
                  <span className="mt-4 block rounded border border-l-4 border-brand border-l-accent bg-surface px-4 py-4 text-ink">
                    {client.copy.contactConfirmation}
                    {/* "" in client.config drops every urgent-line
                        affordance, this one included. */}
                    {client.urgentPhone && (
                      <>
                        {" "}If this is an emergency, call the urgent line at{" "}
                        <a
                          href={`tel:${client.urgentPhoneHref}`}
                          className="font-mono font-semibold tabular-nums text-brand no-underline hover:underline active:text-brand-strong"
                        >
                          {client.urgentPhone}
                        </a>
                        .
                      </>
                    )}
                  </span>
                )}
                {status === "error" && (
                  <span className="mt-4 block border-l-2 border-danger pl-3 text-sm font-medium text-danger">
                    {error}{" "}
                    {/* A failed submit is the one moment the phone number
                        has to be right there, not back up the page. */}
                    <a
                      href={`tel:${client.phoneHref}`}
                      className="font-mono font-semibold tabular-nums text-danger underline underline-offset-4"
                    >
                      {client.phone}
                    </a>
                  </span>
                )}
              </p>
            </form>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-3">
            <dt className="u-label">Office</dt>
            <dd className="m-0 text-[17px] text-ink">
              <a
                href={`tel:${client.phoneHref}`}
                className="border-b-2 border-accent font-mono tabular-nums no-underline transition-colors duration-150 hover:text-brand active:text-brand-strong"
              >
                {client.phone}
              </a>
            </dd>

            {client.urgentPhone && (
              <>
                <dt className="u-label">Urgent line</dt>
                <dd className="m-0 text-[17px] text-ink">
                  <a
                    href={`tel:${client.urgentPhoneHref}`}
                    className="border-b-2 border-accent font-mono tabular-nums no-underline transition-colors duration-150 hover:text-brand active:text-brand-strong"
                  >
                    {client.urgentPhone}
                  </a>
                </dd>
              </>
            )}

            <dt className="u-label">Email</dt>
            <dd className="m-0 text-[17px] text-ink">
              <a
                href={`mailto:${client.email}`}
                className="border-b-2 border-accent no-underline transition-colors duration-150 hover:text-brand active:text-brand-strong"
              >
                {client.email}
              </a>
            </dd>

            <dt className="u-label">Address</dt>
            <dd className="m-0 text-[17px] text-ink">
              {client.address.street}
              <br />
              {client.address.city}, {client.address.region} {client.address.postalCode}
            </dd>
          </dl>

          <table className="mt-10 w-full border-collapse border-t border-line text-base">
            <caption className="u-label pt-6 text-left">Hours</caption>
            <tbody>
              {client.hours.map((h) => (
                <tr key={h.days}>
                  <td className="border-b border-line py-2 text-ink">{h.days}</td>
                  <td className="border-b border-line py-2 text-right font-mono text-[13px]">
                    {h.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {client.mapEmbedSrc && (
            <iframe
              src={client.mapEmbedSrc}
              title={`Map to ${client.businessName}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="mt-10 h-52 w-full rounded border border-line"
            />
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={client.contactPhoto.src}
            width={client.contactPhoto.width}
            height={client.contactPhoto.height}
            alt={client.contactPhoto.alt}
            loading="lazy"
            className="mt-10 w-full rounded"
          />
        </Reveal>
      </div>
    </section>
  );
}
