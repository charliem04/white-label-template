"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { client } from "@/client.config";
import { nav, liveChildren, CTA_HREF, type RouteNode } from "@/lib/routes";

/**
 * Top-level items that are actually built.
 *
 * liveChildren() has always filtered the dropdowns, but the top level
 * was rendered straight from `nav` — which is fine only as long as
 * every top-level item happens to be live. The moment one is not, the
 * header links a page that does not exist, and scripts/routes.mjs fails
 * the build on it. Same rule as the children, applied one level up.
 */
const liveNav = nav.filter((item) => item.live);
import { btn } from "./Button";

/**
 * How long a menu survives the pointer leaving it. Long enough to cross
 * the gap to a neighbouring item or cut a diagonal to the bottom entry;
 * short enough that a menu you have walked away from is gone before you
 * notice it. Opening is immediate — an open delay reads as lag.
 */
const CLOSE_DELAY_MS = 160;

/**
 * Did this element get focus from the keyboard rather than a pointer?
 * `:focus-visible` is the browser’s own answer to that question, and
 * using it keeps the distinction consistent with the focus rings the
 * rest of the site draws. Older engines that reject the selector fall
 * back to "no", which costs a keyboard nicety and breaks nothing.
 */
function isKeyboardFocus(el: EventTarget | null): boolean {
  try {
    return el instanceof HTMLElement && el.matches(":focus-visible");
  } catch {
    return false;
  }
}

/**
 * Five items and a CTA, per the nav spec. Items with live children open
 * a menu; items without are plain links, which is what keeps a section
 * whose children are still being built from advertising dead routes.
 *
 * The menus answer pointer and keyboard the same way: hover or focus
 * opens, Escape closes and returns focus to the trigger, and clicking
 * the trigger itself navigates to the hub. Nothing here traps a
 * keyboard user inside a dropdown.
 *
 * Two details do most of the work in making them feel solid. The gap
 * between a trigger and its panel is padding on the panel’s wrapper,
 * not margin on the panel, so it is part of the hover target instead of
 * a dead strip the pointer falls through. And leaving starts a short
 * countdown rather than closing outright, so cutting a corner on the
 * way to the last item does not shut the menu in your face.
 */
export function Nav() {
  const pathname = usePathname() ?? "/";
  const [drawer, setDrawer] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openMenuNow = (href: string) => {
    cancelClose();
    setOpenMenu(href);
  };
  const closeMenuNow = () => {
    cancelClose();
    setOpenMenu(null);
  };
  /** Leaving starts a countdown; coming back within it cancels. */
  const closeMenuSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenMenu(null), CLOSE_DELAY_MS);
  };

  useEffect(() => cancelClose, []);

  // The rule under the header darkens once the hero starts leaving —
  // the only thing that changes, so the header never jumps in height.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 90);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menus on route change and on Escape or an outside click.
  // These cancel any pending close as well as clearing the state — a
  // timer left running would fire later and shut a menu the visitor had
  // meanwhile reopened.
  useEffect(() => {
    closeMenuNow();
    setDrawer(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Send focus back to the trigger that opened this, so Escape
      // does not drop a keyboard user at the top of the document.
      //
      // Focus first, close second, and the order matters: focusing the
      // trigger fires the group’s onFocus, which reopens the menu.
      // Closing afterwards wins, so Escape actually closes.
      const trigger = headerRef.current?.querySelector<HTMLButtonElement>(
        'button[aria-expanded="true"]'
      );
      trigger?.focus();
      closeMenuNow();
    };
    const onClick = (e: MouseEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) closeMenuNow();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openMenu]);

  const isCurrent = (node: RouteNode) =>
    node.href === pathname ||
    (node.children?.some((c) => c.href === pathname) ?? false);

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 border-b bg-surface transition-colors duration-200 ${
        scrolled ? "border-brand/40" : "border-line"
      }`}
    >
      <div className="section flex min-h-[70px] items-center gap-4 lg:min-h-[78px] lg:gap-6">
        <Link href="/" className="mr-auto flex items-center" aria-label={`${client.businessName} — home`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={client.logoPath}
            alt={client.logoAlt}
            width={552}
            height={219}
            className="h-10 w-auto lg:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-[clamp(10px,1.4vw,22px)] lg:flex" aria-label="Main">
          {liveNav.map((item) => {
            const kids = liveChildren(item);
            const current = isCurrent(item);

            if (kids.length === 0) {
              return (
                <NavLink key={item.href} href={item.href} current={current}>
                  {item.label}
                </NavLink>
              );
            }

            const open = openMenu === item.href;
            return (
              <div
                key={item.href}
                className="relative"
                // Hover only for real mice. On a touch screen a tap
                // fires pointerenter too, which used to open the menu
                // and close it again in the same gesture.
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse") openMenuNow(item.href);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") closeMenuSoon();
                }}
                // Keyboard: tabbing in opens, tabbing out of the whole
                // group closes. relatedTarget is where focus went.
                //
                // Only keyboard focus opens it. A pointer pressing the
                // caret focuses it first and clicks second, so opening
                // on any focus made the click toggle it straight back
                // shut — the caret looked like it did nothing at all.
                onFocus={(e) => {
                  if (isKeyboardFocus(e.target)) openMenuNow(item.href);
                }}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    closeMenuSoon();
                  }
                }}
              >
                <span className="flex items-center gap-1">
                  <NavLink href={item.href} current={current}>
                    {item.label}
                  </NavLink>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`${item.label} menu`}
                    onClick={() => (open ? closeMenuNow() : openMenuNow(item.href))}
                    className="p-1 text-ink-faint transition-colors duration-150 hover:text-brand active:text-brand-strong"
                  >
                    <svg viewBox="0 0 12 12" className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M2 4.5 6 8.5l4-4" />
                    </svg>
                  </button>
                </span>

                {open && (
                  // The wrapper carries the offset as padding rather than
                  // the panel carrying it as margin. That keeps the strip
                  // between the trigger and the panel inside the hover
                  // target — a margin there is a dead zone the pointer
                  // crosses on the way down, which read as flickering.
                  <div className="absolute left-0 top-full z-50 pt-2">
                    <ul className="min-w-[240px] list-none rounded border border-line bg-surface py-1.5">
                      {kids.map((kid) => (
                        <li key={kid.href}>
                          <Link
                            href={kid.href}
                            className={`block px-4 py-2.5 text-[15px] no-underline transition-colors duration-150 hover:bg-surface-alt hover:text-brand active:bg-line/40 ${
                              kid.href === pathname ? "text-brand" : "text-ink"
                            }`}
                          >
                            {kid.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <a href={`tel:${client.phoneHref}`} className={`max-lg:hidden ${btn("line", "sm")} font-mono tabular-nums`}>
            {client.phone}
          </a>
          <a href={CTA_HREF} className={`${btn("gold", "sm")} whitespace-nowrap`}>
            {client.copy.navCta}
          </a>
          <button
            className="rounded border border-line p-2.5 transition-colors duration-150 hover:border-brand active:bg-surface-alt lg:hidden"
            aria-expanded={drawer}
            aria-controls="mobile-nav"
            aria-label={drawer ? "Close menu" : "Open menu"}
            onClick={() => setDrawer((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {drawer ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {drawer && (
        <nav id="mobile-nav" className="border-t border-line bg-surface lg:hidden" aria-label="Main, mobile">
          <div className="section pb-6">
            {liveNav.map((item) => {
              const kids = liveChildren(item);
              return (
                <div key={item.href} className="border-b border-line">
                  <Link
                    href={item.href}
                    onClick={() => setDrawer(false)}
                    className="block py-4 font-semibold text-ink no-underline transition-colors duration-150 hover:text-brand active:text-brand-strong"
                  >
                    {item.label}
                  </Link>
                  {kids.length > 0 && (
                    <ul className="list-none pb-3 pl-4 pt-0">
                      {kids.map((kid) => (
                        <li key={kid.href}>
                          <Link
                            href={kid.href}
                            onClick={() => setDrawer(false)}
                            className="block py-2 text-[15px] text-ink-soft no-underline transition-colors duration-150 hover:text-brand active:text-brand-strong"
                          >
                            {kid.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            <a
              href={`tel:${client.phoneHref}`}
              onClick={() => setDrawer(false)}
              className="block border-b border-line py-4 font-semibold text-ink no-underline transition-colors duration-150 hover:text-brand active:text-brand-strong"
            >
              Call {client.phone}
            </a>
            <a href={CTA_HREF} className={`mt-6 w-full ${btn("gold")}`}>
              {client.copy.navCta}
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="group relative py-1.5 text-[15px] font-semibold text-ink no-underline active:text-brand"
    >
      {children}
      <span
        aria-hidden
        className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent transition-transform duration-200 group-hover:scale-x-100 ${
          current ? "scale-x-100" : "scale-x-0"
        }`}
      />
    </Link>
  );
}
