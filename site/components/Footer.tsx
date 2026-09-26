import Link from "next/link";
import { client } from "@/client.config";
import { nav, liveChildren } from "@/lib/routes";
import { SocialIcons } from "./SocialIcons";

/**
 * The footer is generated from the same route registry as the nav, so a
 * page that exists is reachable from the bottom of every other page,
 * and a page that does not exist is listed in neither.
 */
export function Footer() {
  const year = new Date().getFullYear();

  // Services get their own column; the rest of the nav collapses into
  // one, since those sections are single pages or still being built.
  const servicesNode = nav.find((n) => n.href === "/services/");
  const serviceLinks = servicesNode ? liveChildren(servicesNode) : [];
  /**
   * The second column. This used to be a hand-written array, and it
   * rotted exactly the way you would expect: flipping `live` in
   * lib/routes.ts revealed the nav item and added the sitemap entry but
   * never reached the footer, so every newly-launched page quietly
   * missed it. Worse, a route the registry had moved (a child that
   * became a child of something else) appeared twice — once from the
   * generated Services column, once by hand.
   *
   * So it is a projection of the registry too, filtered to what is
   * live. `only` is the curated part — which top-level sections belong
   * in this column, in this order — and that is the only thing worth
   * hand-maintaining, because it is an editorial decision rather than a
   * fact about which pages exist.
   *
   * Anything not live is dropped rather than rendered dead:
   * scripts/routes.mjs resolves every internal href against the files
   * the build produced, so a link to an unbuilt page fails the build.
   */
  const only = ["/services/", "/gallery/", "/financing/", "/about/"];
  const companyLinks = only
    .map((href) => nav.find((n) => n.href === href))
    .filter((n): n is NonNullable<typeof n> => Boolean(n) && n!.live)
    .flatMap((n) => [
      { href: n.href, label: n.label },
      ...liveChildren(n)
        // The Services children already have their own column.
        .filter(() => n.href !== "/services/")
        .map((c) => ({ href: c.href, label: c.label })),
    ]);

  const reach = [
    { label: `Office ${client.phone}`, href: `tel:${client.phoneHref}` },
    // "" in client.config drops the urgent line everywhere, here too.
    ...(client.urgentPhone
      ? [{ label: `Urgent line ${client.urgentPhone}`, href: `tel:${client.urgentPhoneHref}` }]
      : []),
    { label: client.email, href: `mailto:${client.email}` },
    ...(client.socials.google
      ? [{ label: "Google reviews", href: client.socials.google }]
      : []),
  ];

  const link =
    "block py-1.5 text-ink-invert-soft no-underline transition-colors duration-150 hover:text-accent active:text-accent-press";

  return (
    // The footer is the last element on the page, so it is what the
    // fixed mobile Call | Text | Book bar overlaps. Its 64px is added to
    // the footer's own 24px here rather than padding <main>, which would
    // only open a white gap above the footer and leave the row below
    // still covered. Overshooting is harmless — the extra is dark
    // footer ground sitting behind an opaque bar.
    <footer className="on-deep bg-surface-deep pb-[88px] pt-[42px] text-ink-invert-soft lg:pb-6">
      <div className="section">
        <div className="grid gap-[42px] md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={client.logoPath}
              alt={client.logoAlt}
              width={552}
              height={219}
              className="mb-4 h-14 w-auto"
            />
            <p>{client.copy.footerBlurb}</p>
            <SocialIcons className="mt-5" size={20} />
          </div>

          <nav aria-label="Services">
            <h2 className="mb-4 text-[19px] text-ink-invert">Services</h2>
            {serviceLinks.map((l) => (
              <Link key={l.href} href={l.href} className={link}>
                {l.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Company">
            <h2 className="mb-4 text-[19px] text-ink-invert">Company</h2>
            {companyLinks.map((l) => (
              <Link key={l.href} href={l.href} className={link}>
                {l.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Get in touch">
            <h2 className="mb-4 text-[19px] text-ink-invert">Get in touch</h2>
            {reach.map((l) => (
              <a key={l.label} href={l.href} className={link}>
                {l.label}
              </a>
            ))}
            <p className="mt-4 text-sm">
              {client.address.street}
              <br />
              {client.address.city}, {client.address.region}{" "}
              {client.address.postalCode}
            </p>
          </nav>
        </div>

        <div className="mt-[42px] flex flex-wrap justify-between gap-4 border-t border-line-dark/20 pt-6 text-sm">
          <span>
            © {year} {client.legalName}
          </span>
          <span className="flex gap-6">
            <Link
              href="/terms/"
              className="border-b border-transparent text-ink-invert-soft no-underline transition-colors duration-150 hover:border-accent hover:text-accent active:text-accent-press"
            >
              Terms of service
            </Link>
            <Link
              href="/privacy/"
              className="border-b border-transparent text-ink-invert-soft no-underline transition-colors duration-150 hover:border-accent hover:text-accent active:text-accent-press"
            >
              Privacy policy
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
