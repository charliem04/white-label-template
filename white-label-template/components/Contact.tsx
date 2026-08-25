"use client";

import { useState, type FormEvent } from "react";
import { client } from "@/client.config";
import { submitContact } from "@/lib/submitContact";
import { Reveal } from "./Reveal";

type Status = "idle" | "sending" | "sent" | "error";

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setStatus("sending");
    const result = await submitContact({
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      message: String(fd.get("message") ?? ""),
      company: String(fd.get("company") ?? ""),
    });
    if (result.ok) {
      setStatus("sent");
    } else {
      setError(result.error);
      setStatus("error");
    }
  }

  const field =
    "w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-ink placeholder:text-ink-faint focus:border-brand";

  return (
    <section id="contact" className="section">
      <div className="grid gap-12 md:grid-cols-[1fr_0.8fr]">
        <div>
          <Reveal>
            <span className="eyebrow">{client.copy.contactEyebrow}</span>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {client.copy.contactHeading}
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            {status === "sent" ? (
              <div className="mt-8 rounded-xl border border-line bg-brand-soft p-6">
                <h3 className="text-lg font-semibold">Message sent</h3>
                <p className="mt-1">
                  Thanks — we'll get back to you shortly. Need us sooner? Call{" "}
                  <a href={`tel:${client.phoneHref}`} className="font-semibold text-brand">
                    {client.phone}
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate={false}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">Name</span>
                    <input name="name" required autoComplete="name" className={field} />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-ink">Phone</span>
                    <input name="phone" type="tel" required autoComplete="tel" className={field} />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">Email</span>
                  <input name="email" type="email" autoComplete="email" className={field} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-ink">
                    What do you need done?
                  </span>
                  <textarea name="message" rows={4} required className={field} />
                </label>
                {/* Honeypot — visually hidden, bots fill it */}
                <label className="absolute -left-[9999px]" aria-hidden tabIndex={-1}>
                  Company
                  <input name="company" tabIndex={-1} autoComplete="off" />
                </label>

                {status === "error" && (
                  <p role="alert" className="text-sm font-medium text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="rounded-md bg-brand px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
                >
                  {status === "sending" ? "Sending…" : "Send request"}
                </button>
              </form>
            )}
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="space-y-6 rounded-xl border border-line bg-surface-alt p-6">
            <div>
              <h3 className="font-semibold text-ink">Call or text</h3>
              <a href={`tel:${client.phoneHref}`} className="mt-1 block text-lg font-semibold text-brand">
                {client.phone}
              </a>
            </div>
            <div>
              <h3 className="font-semibold text-ink">Address</h3>
              <p className="mt-1">
                {client.address.street}
                <br />
                {client.address.city}, {client.address.region} {client.address.postalCode}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-ink">Hours</h3>
              <dl className="mt-1 space-y-1">
                {client.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4 text-sm">
                    <dt className="text-ink-faint">{h.days}</dt>
                    <dd>{h.time}</dd>
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
                className="h-52 w-full rounded-lg border border-line"
              />
            ) : (
              <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-line text-sm text-ink-faint">
                Map embed goes here — set mapEmbedSrc in client.config.ts
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
