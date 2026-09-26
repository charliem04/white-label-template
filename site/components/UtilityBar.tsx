import { client } from "@/client.config";
import { SocialIcons } from "./SocialIcons";

/**
 * The rail above the header: where the business is, when it answers,
 * the urgent line, and the social links — which live here rather than in
 * the main nav, where they would pull visitors off the site mid-decision.
 */
export function UtilityBar() {
  return (
    /* A named <section> so this counts as a landmark. Unlandmarked it
       was the one strip of the page a screen-reader user could only
       reach by walking the whole document. */
    <section
      aria-label="Hours and contact"
      className="bg-surface-deep text-ink-invert-soft/80"
    >
      <div className="section flex min-h-10 flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2 font-mono text-[12px] uppercase tracking-[0.09em]">
        <span>{client.copy.utilityBar}</span>
        <span className="flex items-center gap-4">
          <span>
            {/* Without an urgent line the office number takes its
                place — the rail should always end in something to dial. */}
            <span className="hidden sm:inline">
              {client.hoursShort}
              <span className="px-2 text-line-dark/35">|</span>
            </span>
            {client.urgentPhone ? "Urgent line" : "Call"}{" "}
            <a
              href={`tel:${client.urgentPhone ? client.urgentPhoneHref : client.phoneHref}`}
              className="border-b border-accent/40 text-accent no-underline transition-colors duration-150 hover:border-ink-invert hover:text-ink-invert active:text-accent-press"
            >
              {client.urgentPhone || client.phone}
            </a>
          </span>
          <SocialIcons size={15} className="max-sm:hidden" />
        </span>
      </div>
    </section>
  );
}
