import { useEffect, useState } from 'react'

import {
  Button,
  Card,
  Field,
  Input,
  LoadingBar,
  Meta,
  Notice,
  OverrideBanner,
  PageBody,
  PageHeader,
  RestrictedCard,
  SectionHeading,
  WardBadge,
} from '../components/index.js'
import { apiFetch } from '../lib/api.js'
import { SECTIONS } from '../lib/labels.js'
import { hrefFor } from '../lib/router.js'
import { formatTimestamp } from '../lib/time.js'

/**
 * DESIGN.md page 3 — "the page the video lingers on".
 *
 * Four sections stacked in one continuous scroll (no tabs), each a card. A
 * section the viewer may not read still renders, with its content replaced by a
 * lock — "visible restriction, never a silently missing section — this is the
 * whole point of the demo."
 *
 * Which sections are restricted is read entirely from the API response. Records
 * the viewer may not read still come back, carrying the type but no content, so
 * a section with hidden records is distinguishable from one with none. That
 * distinction matters: calling an empty section "restricted" would be a lie.
 */

function SectionCard({ title, records }) {
  // Records of one type are always all-allowed or all-denied — the check is on
  // the record type, not on the individual row.
  if (records.some((record) => !record.allowed)) {
    return <RestrictedCard title={title} className="mb-5" />
  }

  return (
    <Card className="mb-5">
      <SectionHeading>{title}</SectionHeading>
      {records.length === 0 ? (
        <p className="mt-3 text-body text-ink-muted">Nothing recorded in this section.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {records.map((record) => (
            <p key={record.id} className="text-body">
              {record.content}
            </p>
          ))}
        </div>
      )}
    </Card>
  )
}

/**
 * The inline override panel.
 *
 * DESIGN.md: clicking the override button "doesn't open a modal — it expands an
 * inline panel directly below the header (smooth height transition, ~200ms)".
 * This is one of only two animated things in the whole app; everything else is
 * deliberately still, which is what makes this read as an event.
 */
function OverridePanel({ open, onSubmit, busy, error }) {
  const [reason, setReason] = useState('')

  return (
    <div
      className={[
        'overflow-hidden transition-[max-height] duration-200 ease-out',
        open ? 'max-h-64' : 'max-h-0',
      ].join(' ')}
      // Collapsing to zero height hides the panel visually but leaves its input
      // and Confirm button in the tab order, so a keyboard user would land on
      // controls they cannot see. `inert` removes them from focus and from the
      // accessibility tree until the panel actually opens.
      inert={!open}
    >
      <div className="border-b border-border bg-bg px-10 py-6">
        <form
          className="max-w-2xl"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit(reason)
          }}
        >
          <Field
            label="Reason for emergency access"
            htmlFor="override-reason"
            hint="Recorded against your name in the audit log."
          >
            <Input
              id="override-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={200}
              disabled={!open || busy}
            />
          </Field>

          {error ? (
            <p className="mb-4 text-meta text-denied" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" variant="override" disabled={busy}>
            {busy ? 'Recording…' : 'Confirm'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export function PatientDetailPage({ patientId }) {
  const [state, setState] = useState({ status: 'loading' })
  const [override, setOverride] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [overrideError, setOverrideError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    setOverride(null)
    setPanelOpen(false)
    setOverrideError(null)

    apiFetch(`/patients/${patientId}`)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch((error) => {
        if (cancelled) return
        // 403 is the patient-level gate refusing: not this patient at all,
        // as opposed to a single restricted section.
        setState({ status: error.status === 403 ? 'denied' : 'error', error })
      })

    return () => {
      cancelled = true
    }
  }, [patientId])

  async function submitOverride(reason) {
    setOverrideError(null)
    if (!reason.trim()) {
      setOverrideError('An override requires a reason.')
      return
    }
    setBusy(true)
    try {
      const data = await apiFetch(`/patients/${patientId}/override`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() }),
      })
      setOverride(data)
      setState({ status: 'ready', data })
      setPanelOpen(false)
    } catch (error) {
      setOverrideError(error.message)
    } finally {
      setBusy(false)
    }
  }

  const ready = state.status === 'ready'
  const denied = state.status === 'denied'
  const patient = ready ? state.data.patient : null
  const records = ready ? state.data.records : []
  const overrideActive = Boolean(override)

  return (
    <>
      {/* DESIGN.md: full-width, at the very top of the page, and it stays for
          the rest of the page view. */}
      {overrideActive ? (
        <OverrideBanner
          reason={override.override_reason}
          timestamp={formatTimestamp(override.override_logged_at)}
        />
      ) : null}

      <PageHeader
        title={patient ? patient.name : `Patient #${patientId}`}
        titleClassName="text-patient-name"
        context={
          patient ? (
            <span className="flex flex-wrap items-center gap-3">
              <WardBadge ward={patient.ward} />
              <Meta>{patient.is_admitted ? 'Admitted' : 'Discharged'}</Meta>
            </span>
          ) : null
        }
        action={
          // Top-right of the header. Once an override is active there is
          // nothing left for it to unlock, so it goes rather than sitting there
          // inert — and DESIGN.md wants this colour to stay rare.
          denied || ready ? (
            overrideActive ? null : (
              <Button variant="override" onClick={() => setPanelOpen((open) => !open)}>
                Emergency override
              </Button>
            )
          ) : null
        }
      >
        <OverridePanel
          open={panelOpen}
          onSubmit={submitOverride}
          busy={busy}
          error={overrideError}
        />
      </PageHeader>

      {state.status === 'loading' ? <LoadingBar show /> : null}

      <PageBody>
        {state.status === 'error' ? (
          <Notice>
            <p className="text-body">
              {state.error.status === 404
                ? 'That patient does not exist.'
                : `Could not open this record: ${state.error.message}`}
            </p>
            <p className="mt-3 text-body">
              <a href={hrefFor('patients')} className="text-primary underline">
                Back to your patient list
              </a>
            </p>
          </Notice>
        ) : null}

        {denied ? (
          <Notice>
            <p className="text-body">
              You don&apos;t have access to this patient because you&apos;re not assigned
              to them.
            </p>
            <p className="mt-1.5 text-meta text-ink-muted">{state.error.message}</p>
            <p className="mt-3 text-body">
              <a href={hrefFor('patients')} className="text-primary underline">
                Back to your patient list
              </a>
            </p>
          </Notice>
        ) : null}

        {ready
          ? SECTIONS.map((section) => (
              <SectionCard
                key={section.type}
                title={section.title}
                records={records.filter((record) => record.type === section.type)}
              />
            ))
          : null}
      </PageBody>
    </>
  )
}
