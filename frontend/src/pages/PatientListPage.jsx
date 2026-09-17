import { useEffect, useState } from 'react'

import {
  LoadingBar,
  Meta,
  Notice,
  PageBody,
  PageHeader,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  WardBadge,
} from '../components/index.js'
import { apiFetch } from '../lib/api.js'
import { ROLE_LABELS, hasPatientAccess } from '../lib/labels.js'
import { hrefFor } from '../lib/router.js'

/**
 * DESIGN.md page 2.
 *
 * The one line of context under the title is called out in the spec as doing
 * real work — "this single sentence is important, it's what makes the access
 * restriction visible and understandable rather than mysterious" — so it is
 * built from the signed-in user rather than being a static string.
 *
 * The table is plain: no card wrapper, no decorative chrome. Rows carry their
 * own surface background so the table reads without being framed.
 */

function AssignedDot({ assigned }) {
  if (!assigned) return <Meta>—</Meta>
  return (
    <span
      className="block size-2 rounded-full bg-granted"
      title="Assigned to you"
    />
  )
}

/** What an empty list means depends on why it is empty. */
function EmptyList({ user }) {
  // A role with no record access gets an empty list by construction. Saying so
  // is the difference between "the app is broken" and "this is the design".
  if (!hasPatientAccess(user.role)) {
    return (
      <Notice>
        <p className="text-body">
          Admin accounts don&apos;t have access to patient records. Your screen is
          the <a href={hrefFor('audit')} className="text-primary underline">audit log</a>,
          which shows every record that was opened, by whom, and on what authority.
        </p>
      </Notice>
    )
  }
  return (
    <Notice>
      <p className="text-body">
        There are no patients in {user.ward ?? 'your ward'} at the moment.
      </p>
    </Notice>
  )
}

export function PatientListPage({ user }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    apiFetch('/patients')
      .then((patients) => {
        if (!cancelled) setState({ status: 'ready', patients })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', error })
      })
    return () => {
      cancelled = true
    }
  }, [user.id])

  const role = (ROLE_LABELS[user.role] ?? user.role).toLowerCase()
  // DESIGN.md's sentence, except where it would be false: an admin's list is
  // empty by design, so claiming to show them patients would be a lie.
  const context = hasPatientAccess(user.role)
    ? `Showing patients visible to you as ${role} on ${user.ward ?? 'no ward'}.`
    : 'Your account has no access to patient records.'

  function open(patientId) {
    window.location.hash = hrefFor(`patients/${patientId}`)
  }

  return (
    <>
      <PageHeader title="Patients" context={context} />

      {state.status === 'loading' ? <LoadingBar show /> : null}

      <PageBody>
        {state.status === 'error' ? (
          <Notice>
            <p className="text-body">
              {state.error.status === 401
                ? 'Your session has expired. Please sign in again.'
                : `Could not load the patient list: ${state.error.message}`}
            </p>
          </Notice>
        ) : null}

        {state.status === 'ready' && state.patients.length === 0 ? (
          <EmptyList user={user} />
        ) : null}

        {state.status === 'ready' && state.patients.length > 0 ? (
          <Table>
            <THead>
              <Tr>
                {/* The patient column absorbs the spare width, so the three
                    narrow columns pack together at the right rather than
                    spreading apart. */}
                <Th className="w-full">Patient</Th>
                <Th>Ward</Th>
                <Th>Status</Th>
                <Th className="w-16">
                  <span className="sr-only">Assigned to you</span>
                </Th>
              </Tr>
            </THead>
            <TBody>
              {state.patients.map((patient) => (
                <Tr key={patient.id} interactive onClick={() => open(patient.id)}>
                  <Td>
                    {/* A real link so the row is reachable by keyboard; the row
                        itself handles the mouse. */}
                    <a
                      href={hrefFor(`patients/${patient.id}`)}
                      className="text-ink no-underline"
                    >
                      {patient.name}
                    </a>
                  </Td>
                  <Td>
                    <WardBadge ward={patient.ward} />
                  </Td>
                  <Td>{patient.is_admitted ? 'Admitted' : 'Discharged'}</Td>
                  <Td>
                    <AssignedDot assigned={patient.assigned} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        ) : null}
      </PageBody>
    </>
  )
}
