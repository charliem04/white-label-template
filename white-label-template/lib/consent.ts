/**
 * Cookie-consent state. Non-essential scripts (analytics) must check
 * this before loading. Stored in localStorage; a custom event lets
 * components react to consent granted after initial mount.
 */
const KEY = "cookie-consent"; // "accepted" | "declined"
export const CONSENT_EVENT = "consent-changed";

export type ConsentValue = "accepted" | "declined" | null;

export function getConsent(): ConsentValue {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "accepted" || v === "declined" ? v : null;
}

export function setConsent(value: Exclude<ConsentValue, null>) {
  window.localStorage.setItem(KEY, value);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}
