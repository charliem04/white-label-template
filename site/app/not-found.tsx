import Link from "next/link";
import { client } from "@/client.config";
import { getServices } from "@/lib/content";
import { btn } from "@/components/Button";

export const metadata = {
  title: `Page not found | ${client.businessName}`,
};

/**
 * A 404 that does the one useful thing a 404 can: hand back the routes
 * that do exist, and the phone number, since a fair share of the people
 * who land here were trying to reach someone.
 */
export default function NotFound() {
  // A <section>, not a <main>: app/layout.tsx already provides the main
  // landmark, and a document with two of them is invalid — assistive
  // tech loses the "skip to main" target it relies on.
  return (
    <section className="on-deep flex min-h-[70vh] items-center bg-surface-deep text-ink-invert-soft">
      <div className="section py-20">
        <p className="u-label text-accent">Error 404</p>
        <h1 className="mt-4 max-w-[18ch] text-display-2 text-ink-invert">
          That page isn’t here
        </h1>
        <p className="mt-4 max-w-[52ch] text-lg">
          It may have moved, or the link may be wrong. If you were trying to
          reach us, the fastest route is the phone.
        </p>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <Link href="/" className={btn("gold")}>
            Back to the home page
          </Link>
          <a href={`tel:${client.phoneHref}`} className={btn("lineDeep")}>
            Call {client.phone}
          </a>
        </div>

        <nav aria-label="Where to go instead" className="mt-12 border-t border-line-dark/20 pt-6">
          <p className="u-label">What we do</p>
          <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2 p-0">
            {getServices().map((s) => (
              <li key={s.slug} className="list-none">
                <Link
                  href={s.meta.path}
                  className="text-ink-invert-soft no-underline transition-colors duration-150 hover:text-accent active:text-accent-press"
                >
                  {s.navLabel}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
