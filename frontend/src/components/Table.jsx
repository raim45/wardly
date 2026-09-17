/**
 * Plain tables. DESIGN.md wants tables to "look like logs, not marketing
 * content" — so these carry no wrapper, no card, no shadow. Rows carry their
 * own `surface` background instead, which is what lets a table sit directly on
 * the page without being framed.
 *
 * Cell padding is DESIGN.md's 12px vertical / 16px horizontal. Headers are
 * sentence case at 13px/500: DESIGN.md forbids ALL-CAPS labels anywhere.
 */
export function Table({ className = '', children, ...props }) {
  return (
    <table className={['w-full border-collapse text-left text-body', className].join(' ')} {...props}>
      {children}
    </table>
  )
}

export function Th({ className = '', children, ...props }) {
  return (
    <th
      scope="col"
      className={[
        'border-b border-border bg-surface px-4 py-3 text-meta font-medium text-ink-muted',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </th>
  )
}

export function Td({ className = '', children, ...props }) {
  return (
    <td
      className={[
        'border-b border-border bg-surface px-4 py-3 align-top group-hover:bg-bg',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </td>
  )
}

/**
 * Row hover shifts the background to `bg` — the only hover treatment DESIGN.md
 * allows ("subtle background tint only — no shadow 'lift', no scale
 * transform").
 *
 * The hover lives on the cells rather than the row because the cells paint
 * their own `surface` background, which would otherwise hide it. `interactive`
 * adds the pointer cursor, and should only be set when the row actually opens
 * something.
 */
export function Tr({ interactive = false, className = '', children, ...props }) {
  return (
    <tr
      className={['group', interactive ? 'cursor-pointer' : '', className].join(' ')}
      {...props}
    >
      {children}
    </tr>
  )
}

export function THead({ className = '', children, ...props }) {
  return (
    <thead className={className} {...props}>
      {children}
    </thead>
  )
}

export function TBody({ className = '', children, ...props }) {
  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  )
}
