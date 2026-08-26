"use client";

/**
 * THE SIGNATURE ELEMENT — the contact form styled as the work-order /
 * estimate sheet a trades shop actually writes on: mono sheet header,
 * ruled underline fields, license line printed at the sheet foot.
 * Everything else on the page stays quieter than this.
 */
import { useState, type FormEvent } from "react";
import { client } from "@/client.config";
import { submitContact } from "@/lib/submitContact";
import { Reveal } from "./Reveal";

type Status = "idle" | "sending" | "sent" | "error";

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  service: "",
  urgency: "",
  message: "",
  company: "", // honeypot
};

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY);

  const set =
    (key: keyof typeof EMPTY) =>
    (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    const result = await submitContact(form);
    if (result.ok) {
      setStatus("sent");
      setForm(EMPTY);
    } else {
      setError(result.error);
      setStatus("error");
    }
  }

  // Paper-form fields: underline rule only, no box chrome
  const field =
    "w-full border-0 border-b border-line bg-transparent px-0 py-2 text-ink " +
    "placeholder:text-ink-faint focus:border-ink focus:ring-0";

  // Selects keep the same rule; native chrome is stripped so the caret
  // beside them can be set in the sheet's mono register.
  const select = `${field} cursor-pointer appearance-none pr-6`;
  // An unchosen select sits at placeholder weight, like an unfilled blank.
  const selectTone = (v: string) => (v ? "text-ink" : "text-ink-faint");

  return (
    <section id="contact" className="section section-break">
      <div className="grid gap-12 md:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <div className="rounded border border-ink bg-surface">
            {/* Sheet header */}
            <div className="flex items-baseline justify-between gap-4 border-b border-ink px-6 py-4">
              <h2 className="text-2xl font-bold sm:text-3xl">
                {client.copy.contactHeading}
              </h2>
              <span className="u-label whitespace-nowrap">
                Work order · No. ____
              </span>
            </div>

            <div className="px-6 py-6">
              {status === "sent" ? (
                <div>
                  <p className="u-label">Received</p>
                  <h3 className="mt-2 text-2xl font-bold">Request logged</h3>
                  <p className="mt-2 leading-relaxed">
                    We'll get back to you shortly. Need us sooner? Call{" "}
                    <a
                      href={`tel:${client.phoneHref}`}
                      className="font-mono font-semibold tabular-nums text-brand"
                    >
                      {client.phone}
                    </a>
                    .
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="u-label mb-1 block">Name</span>
                      <input
                        name="name"
                        required
                        maxLength={100}
                        autoComplete="name"
                        value={form.name}
                        onChange={set("name")}
                        className={field}
                      />
                    </label>
                    <label className="block">
                      <span className="u-label mb-1 block">Phone</span>
                      <input
                        name="phone"
                        type="tel"
                        required
                        maxLength={30}
                        autoComplete="tel"
                        value={form.phone}
                        onChange={set("phone")}
                        className={`${field} font-mono tabular-nums`}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="u-label mb-1 block">Email</span>
                    <input
                      name="email"
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="email"
                      value={form.email}
                      onChange={set("email")}
                      className={field}
                    />
                  </label>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="u-label mb-1 block">Work requested</span>
                      <span className="relative block">
                        <select
                          name="service"
                          required
                          value={form.service}
                          onChange={set("service")}
                          className={`${select} ${selectTone(form.service)}`}
                        >
                          <option value="">Select…</option>
                          {client.form.serviceOptions.map((s) => (
                            <option key={s} value={s} className="text-ink">
                              {s}
                            </option>
                          ))}
                        </select>
                        <span
                          aria-hidden
                          className="pointer-events-none absolute bottom-2.5 right-0 font-mono text-xs text-ink-faint"
                        >
                          ▾
                        </span>
                      </span>
                    </label>

                    <label className="block">
                      <span className="u-label mb-1 block">Needed by</span>
                      <span className="relative block">
                        <select
                          name="urgency"
                          required
                          value={form.urgency}
                          onChange={set("urgency")}
                          className={`${select} ${selectTone(form.urgency)}`}
                        >
                          <option value="">Select…</option>
                          {client.form.urgencyOptions.map((u) => (
                            <option key={u} value={u} className="text-ink">
                              {u}
                            </option>
                          ))}
                        </select>
                        <span
                          aria-hidden
                          className="pointer-events-none absolute bottom-2.5 right-0 font-mono text-xs text-ink-faint"
                        >
                          ▾
                        </span>
                      </span>
                    </label>
                  </div>

                  <label className="block">
                    <span className="u-label mb-1 block">Details (optional)</span>
                    <textarea
                      name="message"
                      rows={4}
                      maxLength={2000}
                      value={form.message}
                      onChange={set("message")}
                      className={`${field} resize-none`}
                    />
                  </label>

                  {/* Honeypot — visually hidden, bots fill it */}
                  <label className="absolute -left-[9999px]" aria-hidden tabIndex={-1}>
                    Company
                    <input
                      name="company"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.company}
                      onChange={set("company")}
                    />
                  </label>

                  {status === "error" && (
                    <p
                      role="alert"
                      className="border-l-2 border-brand pl-3 text-sm font-medium text-brand"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="btn-press rounded bg-brand px-7 py-3 text-lg font-semibold text-white hover:bg-brand-strong active:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === "sending" ? "Sending…" : "Send request"}
                  </button>
                </form>
              )}
            </div>

            {/* Sheet foot: license line */}
            {client.badges.length > 0 && (
              <p className="u-label border-t border-line px-6 py-3">
                {client.badges.join("  ·  ")}
              </p>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="space-y-7">
            <div>
              <h3 className="u-label">Call or text</h3>
              <a
                href={`tel:${client.phoneHref}`}
                className="mt-1 block font-mono text-2xl font-semibold tabular-nums text-ink underline-offset-4 hover:underline active:text-ink-faint"
              >
                {client.phone}
              </a>
            </div>
            <div>
              <h3 className="u-label">Address</h3>
              <p className="mt-1 leading-relaxed text-ink">
                {client.address.street}
                <br />
                {client.address.city}, {client.address.region} {client.address.postalCode}
              </p>
            </div>
            <div>
              <h3 className="u-label">Hours</h3>
              <dl className="mt-2 max-w-xs">
                {client.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4 border-b border-line py-1.5 text-sm">
                    <dt className="text-ink-faint">{h.days}</dt>
                    <dd className="font-mono tabular-nums text-ink">{h.time}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Map slot */}
            {client.mapEmbedSrc ? (
              <iframe
                src={client.mapEmbedSrc}
                title={`Map to ${client.businessName}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-52 w-full rounded border border-line"
              />
            ) : (
              <div className="flex h-52 items-center justify-center rounded border border-dashed border-line text-sm text-ink-faint">
                Map embed goes here — set mapEmbedSrc in client.config.ts
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
