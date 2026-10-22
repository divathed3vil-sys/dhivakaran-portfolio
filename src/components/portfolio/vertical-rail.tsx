'use client';

/**
 * #26 Vertical-RL credit rail — a single vertical mono label on the Hero side.
 * "don't overdo" — applied to ONE section only.
 */
export function VerticalRail({
  text,
  side = 'right',
}: {
  text: string;
  side?: 'left' | 'right';
}) {
  return (
    <div
      className="vertical-rail"
      aria-hidden="true"
      style={{
        position: 'absolute',
        [side]: '1.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 4,
      }}
    >
      {text}
    </div>
  );
}
