import { forwardRef } from 'react'

/**
 * Rectangular, 6px radius. DESIGN.md: "No rounded pill buttons everywhere —
 * only badges/tags are pill-shaped, buttons stay rectangular with 6px radius."
 *
 * No transition classes anywhere: DESIGN.md reserves motion for the emergency
 * override panel and its banner, so hover tints apply instantly rather than
 * animating.
 */
const VARIANTS = {
  // The single primary action on a screen.
  primary: 'bg-primary text-white hover:bg-primary-hover',
  // Everything else: bordered, unfilled, calm.
  secondary: 'bg-transparent text-ink border border-border hover:bg-bg',
  // Reserved for emergency override. DESIGN.md: `override` "must never be
  // reused for anything else in the app — its rarity is what makes it read as
  // urgent". There should be at most one of these visible per screen.
  override: 'bg-override text-white hover:brightness-95',
  // Inline text actions, e.g. "Refresh".
  quiet: 'bg-transparent text-primary hover:bg-bg',
}

const SIZES = {
  md: 'px-4 py-2 text-body',
  sm: 'px-3 py-1.5 text-meta',
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-control font-medium',
        'disabled:cursor-default disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className,
      ].join(' ')}
      {...props}
    />
  )
})
