"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "@/lib/consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if no choice has been stored yet
    setVisible(getConsent() === null);
  }, []);

  if (!visible) return null;

  function choose(value: "accepted" | "declined") {
    setConsent(value);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Analytics consent"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-xl rounded border border-ink bg-surface p-5 md:bottom-5"
    >
      {/* Says what actually happens. The analytics we use are cookieless
          and the only thing stored is this answer — claiming "we use
          cookies" would be easier and untrue. */}
      <p className="text-sm leading-relaxed">
        May we load privacy-friendly analytics to see which pages get used? It
        sets no cookies and doesn’t follow you to other sites. Decline and
        the script never loads. Either way we remember your answer in this
        browser. See our{" "}
        <Link href="/privacy/" className="font-medium text-brand underline underline-offset-2">
          privacy policy
        </Link>
        .
      </p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => choose("accepted")}
          className="btn-press rounded bg-ink px-4 py-2 text-sm font-semibold text-surface hover:bg-ink-soft active:bg-ink-soft"
        >
          Accept
        </button>
        <button
          onClick={() => choose("declined")}
          className="btn-press rounded border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-ink-faint active:bg-surface-alt"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
