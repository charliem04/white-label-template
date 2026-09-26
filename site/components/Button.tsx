/**
 * Button classes, in one place so every action on the page presses the
 * same way. Four variants and two sizes — no more, so the page never
 * has to explain which of five buttons is the real one.
 *
 *   gold      the single conversion action (assessment / estimate)
 *   ink       a secondary action on a light ground
 *   line      an outline action on a light ground
 *   lineDeep  an outline action on the deep ink ground
 */
type Variant = "gold" | "ink" | "line" | "lineDeep";

const base =
  "inline-flex items-center justify-center gap-2 rounded border font-semibold " +
  "no-underline transition-colors duration-150 active:translate-y-px";

const sizes = {
  md: "px-[26px] py-[15px] text-base",
  sm: "px-[18px] py-[11px] text-[15px]",
};

const variants: Record<Variant, string> = {
  gold: "border-accent-press bg-accent text-accent-ink hover:bg-accent-lift active:bg-accent-press",
  ink: "border-ink bg-ink text-ink-invert hover:border-brand hover:bg-brand active:bg-brand-strong",
  line: "border-line bg-transparent text-ink hover:border-brand hover:bg-brand/5 active:bg-brand/10",
  lineDeep:
    "border-line-dark/20 bg-transparent text-ink-invert hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/20",
};

export function btn(variant: Variant = "gold", size: keyof typeof sizes = "md") {
  return `${base} ${sizes[size]} ${variants[variant]}`;
}
