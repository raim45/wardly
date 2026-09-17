/**
 * Line-art marks, drawn rather than sourced.
 *
 * DESIGN.md forbids "stock photography, no generic medical cross icons, no
 * stethoscope clipart" and asks for the login shield to be "a simple line-art
 * icon (shield + person outline, single stroke weight)". Everything here is a
 * single stroke weight and inherits `currentColor`, so a mark can never
 * introduce a colour of its own.
 */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/** Shield with a person inside — the login page's mark. */
export function ShieldPersonMark({ className = '' }) {
  return (
    <svg viewBox="0 0 120 140" className={className} aria-hidden="true" {...STROKE}>
      <path d="M60 6 110 26v40c0 34-22 58-50 68-28-10-50-34-50-68V26z" />
      <circle cx="60" cy="57" r="14" />
      <path d="M37 99c0-15 10-24 23-24s23 9 23 24" />
    </svg>
  )
}
