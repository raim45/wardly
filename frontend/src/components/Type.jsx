/**
 * The type scale as components, so no page hand-rolls a font size.
 *
 * DESIGN.md's scale, verbatim:
 *   page title       26px / Plex Serif / weight 600
 *   section heading  17px / Plex Serif / weight 600
 *   body / table     15px / Plex Sans / weight 400
 *   labels, meta     13px / Plex Sans / weight 500
 *   timestamps, IDs  13px / Plex Mono
 *
 * DESIGN.md also forbids two things this file must never do: ALL-CAPS labels,
 * and picking a single word out of a headline in colour or italics.
 */

export function PageTitle({ as: Tag = 'h1', className = '', children, ...props }) {
  return (
    <Tag className={['text-page-title font-serif text-ink', className].join(' ')} {...props}>
      {children}
    </Tag>
  )
}

export function SectionHeading({ as: Tag = 'h2', muted = false, className = '', children, ...props }) {
  return (
    <Tag
      className={[
        'text-section font-serif',
        muted ? 'text-ink-muted' : 'text-ink',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </Tag>
  )
}

/** Secondary text, field labels, meta. 13px / 500. */
export function Meta({ as: Tag = 'span', className = '', children, ...props }) {
  return (
    <Tag className={['text-meta font-medium text-ink-muted', className].join(' ')} {...props}>
      {children}
    </Tag>
  )
}

/**
 * Plex Mono, for functional data only — timestamps, IDs, log entries.
 * DESIGN.md: "never for regular labels".
 */
export function Mono({ as: Tag = 'span', className = '', children, ...props }) {
  return (
    <Tag className={['font-mono text-meta', className].join(' ')} {...props}>
      {children}
    </Tag>
  )
}

/** A record ID or similar, in mono and muted. */
export function Id({ children, className = '', ...props }) {
  return (
    <Mono className={['text-ink-muted', className].join(' ')} {...props}>
      {children}
    </Mono>
  )
}

/**
 * A timestamp, in mono and muted, and never allowed to wrap — a date broken
 * across two lines ("17 Sep 2026," / "14:22:08") is exactly the kind of thing
 * that makes a log table hard to scan.
 */
export function Timestamp({ children, className = '', ...props }) {
  return (
    <Mono className={['whitespace-nowrap text-ink-muted', className].join(' ')} {...props}>
      {children}
    </Mono>
  )
}
