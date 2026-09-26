/**
 * A rating, drawn.
 *
 * Half-stars are done with a clipped overlay rather than a separate
 * half-star glyph, so 4.7 reads as 4.7 and not as "about 5". The
 * accessible name carries the number itself — a screen reader gets
 * "4.7 out of 5", not five images of a star.
 */
export function Stars({
  rating,
  small,
}: {
  rating: number;
  small?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  const size = small ? "text-[15px]" : "text-[19px]";

  return (
    <span
      className={`relative inline-block whitespace-nowrap leading-none ${size}`}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5`}
    >
      <span aria-hidden className="text-line">
        {"★★★★★"}
      </span>
      <span
        aria-hidden
        className="absolute left-0 top-0 overflow-hidden text-accent-press"
        style={{ width: `${pct}%` }}
      >
        {"★★★★★"}
      </span>
    </span>
  );
}
