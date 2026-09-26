import type { Config } from "tailwindcss";

/**
 * ── BRAND SWAP ──────────────────────────────────────────────────────
 * All colors resolve to CSS variables defined in app/globals.css.
 * To re-skin a client site you edit the variable values there — this
 * file should not need to change per client.
 *
 * Tokens to set per client (in globals.css):
 *   --brand / --brand-strong / --brand-soft   structure accent
 *   --accent / --accent-lift / --accent-press call-to-action accent
 *   --accent-ink                              text on the action accent
 *   --ink / --ink-soft / --ink-faint          text on light grounds
 *   --ink-invert / --ink-invert-soft          text on the deep ground
 *   --surface / --surface-alt                 light grounds
 *   --surface-deep / --surface-deep-alt       dark band grounds
 *   --danger / --danger-soft                  form error states
 *   --line / --line-dark                      rules / dividers
 *   --font-display / --font-body / --font-utility
 * ────────────────────────────────────────────────────────────────────
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(var(--brand) / <alpha-value>)",
          strong: "rgb(var(--brand-strong) / <alpha-value>)",
          soft: "rgb(var(--brand-soft) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          lift: "rgb(var(--accent-lift) / <alpha-value>)",
          press: "rgb(var(--accent-press) / <alpha-value>)",
          ink: "rgb(var(--accent-ink) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
          invert: "rgb(var(--ink-invert) / <alpha-value>)",
          "invert-soft": "rgb(var(--ink-invert-soft) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          alt: "rgb(var(--surface-alt) / <alpha-value>)",
          deep: "rgb(var(--surface-deep) / <alpha-value>)",
          "deep-alt": "rgb(var(--surface-deep-alt) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          soft: "rgb(var(--danger-soft) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--line) / <alpha-value>)",
          dark: "rgb(var(--line-dark) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        mono: "var(--font-utility)",
      },
      fontSize: {
        // Display steps span 21px → 102px: a 4.9x range, so hierarchy
        // comes from size, not from weight tricks at one size.
        "display-1": ["clamp(48px, 8.2vw, 102px)", { lineHeight: "0.9" }],
        "display-2": ["clamp(36px, 5.2vw, 62px)", { lineHeight: "0.9" }],
        "display-3": ["clamp(21px, 2.4vw, 27px)", { lineHeight: "1" }],
        "display-4": ["clamp(20px, 2.3vw, 28px)", { lineHeight: "1.02" }],
      },
      borderRadius: {
        // One radius for the whole site: 2px. Paperwork, not cards.
        DEFAULT: "2px",
      },
      transitionTimingFunction: {
        // The same curve framer-motion uses for every entrance on the
        // site — ease.out in lib/motion.ts. A CSS hover transition and a
        // scroll reveal that land on the same card should decelerate the
        // same way, and the only way to guarantee that is to write the
        // number once. Change it here and in lib/motion.ts together.
        brand: "cubic-bezier(0.21, 0.65, 0.36, 1)",
      },
      maxWidth: {
        content: "75rem",
      },
    },
  },
  plugins: [],
};
export default config;
