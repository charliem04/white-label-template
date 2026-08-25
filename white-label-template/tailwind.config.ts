import type { Config } from "tailwindcss";

/**
 * ── BRAND SWAP ──────────────────────────────────────────────────────
 * All colors resolve to CSS variables defined in app/globals.css.
 * To re-skin a client site you edit the variable values there — this
 * file should not need to change per client.
 *
 * Tokens to set per client (in globals.css):
 *   --brand          primary brand color (CTAs, accents)
 *   --brand-strong   hover/active state of primary
 *   --brand-soft     tinted background (icon chips, highlights)
 *   --ink            headings / primary text
 *   --ink-soft       body text
 *   --ink-faint      captions, meta text
 *   --surface        page background
 *   --surface-alt    alternating section background
 *   --line           borders / dividers
 *   --font-display   heading typeface stack
 *   --font-body      body typeface stack
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
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          alt: "rgb(var(--surface-alt) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};
export default config;
