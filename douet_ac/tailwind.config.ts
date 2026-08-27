import type { Config } from "tailwindcss";

/**
 * ── BRAND SWAP ──────────────────────────────────────────────────────
 * All colors resolve to CSS variables defined in app/globals.css.
 * To re-skin a client site you edit the variable values there — this
 * file should not need to change per client.
 *
 * Tokens to set per client (in globals.css):
 *   --brand / --brand-strong / --brand-soft   accent + states
 *   --ink / --ink-soft / --ink-faint          text
 *   --surface / --surface-alt                 grounds (tonal elevation)
 *   --line                                    rules / dividers
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
        mono: "var(--font-utility)",
      },
      borderRadius: {
        // One radius for the whole site: 2px. Paperwork, not cards.
        DEFAULT: "2px",
      },
      maxWidth: {
        content: "72rem",
      },
    },
  },
  plugins: [],
};
export default config;
