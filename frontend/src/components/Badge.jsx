/**
 * Badges and tags are the only pill-shaped things in the app.
 *
 * Colour variants follow DESIGN.md's state tones: a very light tint of the
 * state colour as background (15% opacity) with the full-strength colour as
 * text. Same treatment for ward tags, which is what lets a ward read as one
 * consistent colour everywhere it appears.
 */
const VARIANTS = {
  // Generic tag, e.g. a record type.
  neutral: 'bg-bg text-ink-muted',
  granted: 'bg-granted/15 text-granted',
  denied: 'bg-denied/15 text-denied',
  override: 'bg-override/15 text-override',
}

const BASE =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-meta font-medium'

export function Badge({ variant = 'neutral', className = '', children, ...props }) {
  return (
    <span className={[BASE, VARIANTS[variant], className].join(' ')} {...props}>
      {children}
    </span>
  )
}

/**
 * DESIGN.md page 2 asks for "one consistent color per ward name". The mapping
 * lives here rather than at each call site so a ward can never drift; an
 * unknown ward falls back to the ward-teal token rather than rendering
 * unstyled.
 */
const WARD_STYLES = {
  'Ward 3': 'bg-ward-3/15 text-ward-3',
  'Ward 4': 'bg-ward-4/15 text-ward-4',
  'Ward 7': 'bg-ward-7/15 text-ward-7',
}

export function WardBadge({ ward, className = '', ...props }) {
  const style = WARD_STYLES[ward] ?? 'bg-ward-teal/15 text-ward-teal'
  return (
    <Badge className={[style, className].join(' ')} {...props}>
      {ward}
    </Badge>
  )
}
