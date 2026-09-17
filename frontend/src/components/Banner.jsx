/**
 * The loud one.
 *
 * DESIGN.md: a full-width banner at the very top of the page, `override`
 * background, white text, staying visible for the rest of that page view. "It
 * is the single most visually loud moment in the entire app — everything else
 * stays calm specifically so this moment stands out."
 *
 * This is why no other component in the system uses a saturated fill.
 */
export function OverrideBanner({ reason, timestamp, className = '' }) {
  return (
    <div
      role="status"
      className={['w-full bg-override px-6 py-4 text-white', className].join(' ')}
    >
      <p className="text-body font-semibold">Accessed via Emergency Override</p>
      <p className="text-meta text-white/90">
        reason: “{reason}” — logged {timestamp}
      </p>
    </div>
  )
}

/**
 * The calm counterpart, for things that need explaining without shouting:
 * a denied page, an empty list, a loading note. DESIGN.md requires these
 * states to "always explain what happened and why, in plain language".
 */
export function Notice({ children, className = '', ...props }) {
  return (
    <div
      className={[
        'rounded-card border border-border bg-surface px-6 py-4 text-ink',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
