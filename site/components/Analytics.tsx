"use client";

/**
 * Consent-gated analytics stub (Plausible). Loads ONLY after the
 * visitor accepts cookies, and only if NEXT_PUBLIC_PLAUSIBLE_DOMAIN is
 * set. Swap the script src/attributes for GA4 if a client insists.
 */
import { useEffect, useState } from "react";
import { getConsent, CONSENT_EVENT } from "@/lib/consent";
import { client } from "@/client.config";

const DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "";
const DNI = client.tracking.dniScriptUrl;

export function Analytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!DOMAIN && !DNI) return;
    const check = () => setEnabled(getConsent() === "accepted");
    check();
    window.addEventListener(CONSENT_EVENT, check);
    return () => window.removeEventListener(CONSENT_EVENT, check);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    if (DOMAIN && !document.querySelector("script[data-analytics]")) {
      const s = document.createElement("script");
      s.defer = true;
      s.dataset.analytics = "true";
      s.dataset.domain = DOMAIN;
      s.src = "https://plausible.io/js/script.js";
      document.head.appendChild(s);
    }

    // Call tracking (dynamic number insertion). Same consent gate: it
    // is a third-party script that identifies visitors to the provider.
    if (DNI && !document.querySelector("script[data-call-tracking]")) {
      const s = document.createElement("script");
      s.async = true;
      s.dataset.callTracking = "true";
      s.src = DNI;
      document.head.appendChild(s);
    }
  }, [enabled]);

  return null;
}
