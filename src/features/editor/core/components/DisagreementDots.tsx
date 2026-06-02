interface DisagreementDot {
  /** Stable key — typically the disagreeing annotation's id. */
  id: string;
  /** Dot color; defaults to amber when omitted. */
  color?: string;
}

/**
 * A row of up to five small colored dots under a token, signalling that other
 * annotators disagree. Shared by the POS editor (per-tag colors) and the WSD
 * editor (amber). Renders nothing when there are no disagreements.
 */
export function DisagreementDots({
  dots,
  title,
}: {
  dots: DisagreementDot[];
  title?: string;
}) {
  if (dots.length === 0) return null;
  return (
    <span className="flex gap-0.5 mt-0.5 leading-none" title={title}>
      {dots.slice(0, 5).map(d => (
        <span
          key={d.id}
          className="w-1 h-1 rounded-full"
          style={{ backgroundColor: d.color ?? '#fbbf24' }}
        />
      ))}
    </span>
  );
}
