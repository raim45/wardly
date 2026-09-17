/**
 * Loading states.
 *
 * DESIGN.md: "a simple text-based 'Loading…' or a thin 2px progress bar in
 * `primary` at the top of the content area — no spinning icons, no skeleton
 * screens (unnecessary complexity for a 5-page demo)".
 *
 * The bar is the one thing in the app that moves without being asked to, so it
 * is deliberately understated: 2px, primary, and it only appears while a
 * request is in flight.
 */
export function LoadingBar({ show }) {
  if (!show) return null
  return (
    <div className="h-0.5 w-full overflow-hidden bg-border" role="progressbar" aria-label="Loading">
      <div className="h-full w-1/3 bg-primary" />
    </div>
  )
}

export function Loading({ children = 'Loading…' }) {
  return <p className="py-6 text-body text-ink-muted">{children}</p>
}
