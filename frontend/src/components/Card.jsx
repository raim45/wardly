/**
 * Flat: a 1px border and an 8px radius, never a shadow. DESIGN.md: "Shadows:
 * none, or a single 1px border instead. Flat, not floating."
 */
import { SectionHeading } from './Type.jsx'

export function Card({ as: Tag = 'section', className = '', children, ...props }) {
  return (
    <Tag className={['rounded-card border border-border bg-surface p-6', className].join(' ')} {...props}>
      {children}
    </Tag>
  )
}

/** A small single-stroke lock, for restricted sections. */
export function LockIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={['mt-0.5 shrink-0', className].join(' ')}
    >
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  )
}

/**
 * A section the viewer may not read. DESIGN.md: the card still renders — the
 * content is replaced, never the section removed — because "visible
 * restriction, never a silently missing section — this is the whole point of
 * the demo."
 *
 * `title` keeps the section's own heading in place, dimmed. DESIGN.md says the
 * *content* is replaced, and dropping the heading too would leave three
 * unlabelled locks on the page with no way to tell which section is which —
 * which is precisely the thing the demo exists to show.
 *
 * The message is DESIGN.md's, verbatim. It names all three checks rather than
 * the one that actually refused; the API returns the precise failing check, so
 * if a more specific sentence is wanted this is the one place to change.
 */
export function RestrictedCard({
  title,
  message = "You don't have access to this — role/ward/assignment check not met.",
  className = '',
}) {
  return (
    <section
      className={[
        'rounded-card border border-border bg-denied/5 p-6',
        className,
      ].join(' ')}
    >
      {title ? <SectionHeading muted>{title}</SectionHeading> : null}
      <div className={['flex items-start gap-3 text-ink-muted', title ? 'mt-3' : ''].join(' ')}>
        <LockIcon />
        <p className="text-body">{message}</p>
      </div>
    </section>
  )
}
