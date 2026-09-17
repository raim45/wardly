import { ROLE_LABELS } from '../lib/labels.js'
import { hrefFor } from '../lib/router.js'

/**
 * DESIGN.md's app shell: "Left sidebar, fixed, 232px wide, `surface`
 * background, right border `border`", carrying the role badge, the nav, and
 * sign out.
 *
 * The role badge is the reason the shell exists as a component rather than
 * being repeated per page: DESIGN.md wants it "always visible so anyone
 * watching the demo video instantly knows who's logged in without you having
 * to say it out loud".
 */

/**
 * One consistent colour per role, for the sidebar dot.
 *
 * DESIGN.md says "Only these colors. Do not introduce new ones per page", and
 * separately asks for a role colour. Rather than invent five, these reuse
 * tones already in the token table, so the dot can never drift from the
 * palette. The role dot and the ward pill use some of the same hues, but they
 * never appear in the same place, so there is nothing to confuse.
 */
const ROLE_DOT = {
  doctor: 'bg-primary',
  nurse: 'bg-ward-teal',
  lab_staff: 'bg-ward-4',
  records_clerk: 'bg-ward-7',
  admin: 'bg-ink-muted',
}

export function RoleDot({ role, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={['size-2.5 shrink-0 rounded-full', ROLE_DOT[role] ?? 'bg-ink-muted', className].join(' ')}
    />
  )
}

function NavLink({ href, active, children }) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={[
        'block rounded-control px-3 py-2 text-body no-underline',
        active
          ? 'bg-bg font-medium text-primary'
          : 'text-ink hover:bg-bg',
      ].join(' ')}
    >
      {children}
    </a>
  )
}

export function AppShell({ user, active = '', onSignOut, banner, children }) {
  // The audit log is admin-only, so its link is absent rather than disabled.
  // Both links point at the `patients` / `audit` sections, so a detail route
  // like #/patients/3 still keeps "Patients" marked as current.
  const links = [{ key: 'patients', label: 'Patients', href: hrefFor('patients') }]
  if (user?.role === 'admin') {
    links.push({ key: 'audit', label: 'Audit log', href: hrefFor('audit') })
  }

  return (
    <div className="min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 flex w-[232px] flex-col border-r border-border bg-surface">
        <div className="border-b border-border p-6">
          <div className="flex items-center gap-2">
            <RoleDot role={user?.role} />
            <span className="text-body font-medium">{user?.name ?? '—'}</span>
          </div>
          <p className="mt-1 text-meta text-ink-muted">
            {ROLE_LABELS[user?.role] ?? '—'} · {user?.ward ?? 'no ward'}
          </p>
        </div>

        <nav className="flex flex-col gap-1 p-3" aria-label="Sections">
          {links.map((link) => (
            <NavLink key={link.key} href={link.href} active={active === link.key}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-3">
          <button
            type="button"
            onClick={onSignOut}
            className="w-full rounded-control px-3 py-2 text-left text-body text-ink-muted hover:bg-bg"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/*
        The banner goes inside the main column, not above the shell. Rendered
        outside it, a full-width banner slides underneath the fixed sidebar and
        its text is cut off.
      */}
      <main className="ml-[232px]">
        {banner}
        {children}
      </main>
    </div>
  )
}

/**
 * DESIGN.md's shell sketch puts "Page title [action]" above a full-width rule,
 * with the content beneath. The action slot is where a page's single primary
 * button goes — on the patient detail page, that is the override button.
 *
 * `titleClassName` exists because DESIGN.md page 3 gives the patient name its
 * own size (22px) rather than the 26px page-title size.
 */
export function PageHeader({
  title,
  context,
  action,
  titleClassName = 'text-page-title',
  children,
}) {
  return (
    <header className="border-b border-border bg-bg px-10 pt-8 pb-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className={['font-serif text-ink', titleClassName].join(' ')}>{title}</h1>
          {context ? <p className="mt-1.5 text-body text-ink-muted">{context}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </header>
  )
}

export function PageBody({ children, className = '' }) {
  return <div className={['px-10 py-8', className].join(' ')}>{children}</div>
}
