"use client";

/**
 * One delegated listener for the three actions that matter — call, text
 * and book — instead of an onClick on every button that offers them.
 *
 * Doing it here means a link added anywhere later is tracked without
 * anyone remembering to wire it, and no component has to import
 * analytics to render a phone number. Mounted once, in the layout.
 */
import { useEffect } from "react";
import { client } from "@/client.config";
import { trackEvent, type ConversionEvent } from "@/lib/tracking";

function classify(href: string): ConversionEvent | null {
  if (href.startsWith("tel:")) return "Call";
  if (href.startsWith("sms:")) return "Text";
  if (client.bookingUrl && href.startsWith(client.bookingUrl)) return "Book";
  return null;
}

export function InteractionTracking() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const event = classify(anchor.getAttribute("href") ?? "");
      if (!event) return;
      // Which line was tapped matters: the urgent line converting more
      // than the office line is a scheduling fact, not a trivia point.
      const label =
        // Guarded: with no urgent line configured, includes("") is true
        // for every href and every office call would be logged urgent.
        client.urgentPhoneHref &&
        anchor.getAttribute("href")?.includes(client.urgentPhoneHref)
          ? "urgent line"
          : "office line";
      trackEvent(event, event === "Book" ? {} : { line: label });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
