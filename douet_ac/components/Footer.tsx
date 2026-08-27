import Link from "next/link";
import { client } from "@/client.config";

export function Footer() {
  const year = new Date().getFullYear();
  const socials = [
    { label: "Facebook", href: client.socials.facebook },
    { label: "Instagram", href: client.socials.instagram },
    { label: "Google reviews", href: client.socials.google },
  ].filter((s) => s.href);

  return (
    <footer className="border-t border-line bg-surface-alt">
      <div className="mx-auto flex max-w-content flex-col gap-5 px-5 py-10 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div>
          <div className="font-display text-lg font-bold uppercase tracking-wide text-ink">
            {client.businessName}
          </div>
          <p className="u-label mt-2">
            © {year} {client.legalName}
            {client.badges[0] ? ` · ${client.badges[0]}` : ""}
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          {socials.map((s) => (
            <a key={s.label} href={s.href} className="text-ink-soft underline-offset-4 hover:text-ink hover:underline active:text-ink-faint" target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
          <Link href="/terms/" className="text-ink-soft underline-offset-4 hover:text-ink hover:underline active:text-ink-faint">
            Terms of service
          </Link>
          <Link href="/privacy/" className="text-ink-soft underline-offset-4 hover:text-ink hover:underline active:text-ink-faint">
            Privacy policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
