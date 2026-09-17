import { useEffect, useMemo, useState } from 'react'

import {
  Badge,
  Button,
  LoadingBar,
  Meta,
  Notice,
  PageBody,
  PageHeader,
  Select,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Timestamp,
  Tr,
} from '../components/index.js'
import { apiFetch } from '../lib/api.js'
import { ACTION_LABELS, ACTION_VARIANTS, FAILED_CHECK_LABELS, ROLE_LABELS } from '../lib/labels.js'
import { formatTimestamp } from '../lib/time.js'

/**
 * DESIGN.md page 4 — admin only.
 *
 * "Plain table, newest first, no card wrapper — logs should look like logs, not
 * marketing content." The whole point of the screen is that "a viewer should be
 * able to tell what matters within a few seconds of looking at it", which is
 * why the three action pills reuse the app's existing tones rather than
 * introducing anything new: the override rows are the ones that jump out.
 */

/**
 * The Reason column carries whichever explanation exists for the row:
 *
 *   override  the reason the person typed
 *   denied    which check refused — the structured `failed_check` the PDF asks
 *             the layer to hand the audit log, phrased for a reader
 *   granted   nothing, so an em dash
 *
 * Denials get their explanation shown muted, to keep a system-generated phrase
 * visually distinct from something a person typed.
 */
function ReasonCell({ entry }) {
  if (entry.action === 'emergency_override' && entry.reason) {
    return <>{entry.reason}</>
  }
  if (entry.action === 'view_denied' && entry.failed_check) {
    return (
      <Meta>{FAILED_CHECK_LABELS[entry.failed_check] ?? entry.failed_check}</Meta>
    )
  }
  return <Meta>—</Meta>
}

export function AuditLogPage({ user }) {
  const [state, setState] = useState({ status: 'loading' })
  const [actionFilter, setActionFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    apiFetch('/audit-log')
      .then((entries) => {
        if (!cancelled) setState({ status: 'ready', entries })
      })
      .catch((error) => {
        if (cancelled) return
        setState({ status: error.status === 403 ? 'forbidden' : 'error', error })
      })
    return () => {
      cancelled = true
    }
  }, [user.id])

  const entries = state.status === 'ready' ? state.entries : []

  const filtered = useMemo(
    () =>
      entries.filter(
        (entry) =>
          (!actionFilter || entry.action === actionFilter) &&
          (!roleFilter || entry.user_role === roleFilter),
      ),
    [entries, actionFilter, roleFilter],
  )

  const filtering = Boolean(actionFilter || roleFilter)

  return (
    <>
      <PageHeader
        title="Audit log"
        context={
          state.status === 'ready'
            ? `Every access decision, newest first — ${entries.length} ${
                entries.length === 1 ? 'entry' : 'entries'
              }.`
            : 'Every access decision, newest first.'
        }
      />

      {state.status === 'loading' ? <LoadingBar show /> : null}

      <PageBody>
        {state.status === 'forbidden' ? (
          <Notice>
            <p className="text-body">
              Only an admin may read the audit log. You are signed in as{' '}
              {(ROLE_LABELS[user.role] ?? user.role).toLowerCase()}.
            </p>
          </Notice>
        ) : null}

        {state.status === 'error' ? (
          <Notice>
            <p className="text-body">Could not load the audit log: {state.error.message}</p>
          </Notice>
        ) : null}

        {state.status === 'ready' ? (
          <>
            {/* DESIGN.md allows a simple filter row, dropdown only. */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2" htmlFor="filter-action">
                <Meta>Action</Meta>
                <Select
                  id="filter-action"
                  value={actionFilter}
                  onChange={(event) => setActionFilter(event.target.value)}
                >
                  <option value="">All</option>
                  {Object.entries(ACTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>

              <label className="flex items-center gap-2" htmlFor="filter-role">
                <Meta>Role</Meta>
                <Select
                  id="filter-role"
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                >
                  <option value="">All</option>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </label>

              {filtering ? (
                <>
                  <Meta>
                    {filtered.length} of {entries.length}
                  </Meta>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => {
                      setActionFilter('')
                      setRoleFilter('')
                    }}
                  >
                    Clear
                  </Button>
                </>
              ) : null}
            </div>

            {entries.length === 0 ? (
              <Notice>
                <p className="text-body">
                  Nothing has been accessed yet. Every grant, denial and override will
                  appear here.
                </p>
              </Notice>
            ) : filtered.length === 0 ? (
              <Notice>
                <p className="text-body">No entries match those filters.</p>
              </Notice>
            ) : (
              // A log table is scanned down its columns, so names are kept on
              // one line each; letting them wrap makes every row a different
              // height and the columns stop lining up.
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <Tr>
                      <Th>Time</Th>
                      <Th>User</Th>
                      <Th>Patient</Th>
                      <Th>Action</Th>
                      <Th className="w-full">Reason</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {filtered.map((entry) => (
                      <Tr key={entry.id}>
                        <Td>
                          <Timestamp>{formatTimestamp(entry.timestamp)}</Timestamp>
                        </Td>
                        <Td className="whitespace-nowrap">
                          {entry.user_name}
                          <br />
                          <Meta>{entry.user_role}</Meta>
                        </Td>
                        <Td className="whitespace-nowrap">{entry.patient_name}</Td>
                        <Td>
                          <Badge variant={ACTION_VARIANTS[entry.action]}>
                            {ACTION_LABELS[entry.action] ?? entry.action}
                          </Badge>
                        </Td>
                        <Td>
                          <ReasonCell entry={entry} />
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </>
        ) : null}
      </PageBody>
    </>
  )
}
