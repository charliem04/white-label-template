/**
 * Cookie-consent state. Non-essential scripts (analytics) must check
 * this before loading. Stored in localStorage; a custom event lets
 * components react to consent granted after initial mount.
 */
/**
 * Exported because /contact/ reads it from an inline script that runs
 * before this module is downloaded. Two copies of a storage key is the
 * kind of thing that stays correct until the day it does not.
 */
export const CONSENT_KEY = "cookie-consent"; // "accepted" | "declined"
const KEY = CONSENT_KEY;
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
