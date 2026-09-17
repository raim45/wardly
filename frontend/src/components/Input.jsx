import { forwardRef } from 'react'

/**
 * Inputs and their labels.
 *
 * DESIGN.md page 1 is explicit: "Labels above inputs, not placeholder-only
 * text (placeholder-only labels disappear once typing starts and hurt
 * usability)." So `Field` always renders a real <label> bound by id, and the
 * input is never relied on to label itself.
 */

export function Field({ label, htmlFor, hint, error, children, className = '' }) {
  return (
    <div className={['mb-5', className].join(' ')}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-meta font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1.5 text-meta text-ink-muted">{hint}</p> : null}
      {error ? (
        <p className="mt-1.5 text-meta text-denied" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef(function Input({ className = '', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={[
        'w-full rounded-control border border-border bg-surface px-3 py-2 text-body text-ink',
        'placeholder:text-ink-muted',
        'disabled:cursor-default disabled:bg-bg disabled:text-ink-muted',
        className,
      ].join(' ')}
      {...props}
    />
  )
})

/**
 * A native <select>. DESIGN.md allows a "dropdown only" filter and rules out
 * "complex date-range picker" — so this stays the platform control, styled to
 * the same box as Input rather than rebuilt, which keeps the keyboard and
 * screen-reader behaviour the browser already provides.
 */
export const Select = forwardRef(function Select({ className = '', children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={[
        'rounded-control border border-border bg-surface px-3 py-2 text-body text-ink',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </select>
  )
})
