/**
 * Display strings, in one place so the same concept is never named two
 * different ways on two different pages.
 *
 * Role names are sentence case: DESIGN.md forbids ALL-CAPS labels anywhere.
 */

export const ROLE_LABELS = {
  doctor: 'Doctor',
  nurse: 'Nurse',
  lab_staff: 'Lab staff',
  records_clerk: 'Records clerk',
  admin: 'Admin',
}

export const RECORD_TYPE_LABELS = {
  note: 'Clinical note',
  result: 'Test result',
  prescription: 'Prescription',
  admin_info: 'Administrative',
}

/**
 * The detail page's sections, in DESIGN.md page 3's order.
 *
 * DESIGN.md lists exactly four sections and we have exactly four record types,
 * so they map one-for-one. `admin_info` is the one that needs explaining: it
 * holds the demographic and administrative data the PDF assigns to the records
 * clerk — insurance, next of kin, pre-authorisation — so it becomes
 * "Demographics". The patient's own identity is already in the page header, so
 * the section does not repeat it.
 */
export const SECTIONS = [
  { type: 'admin_info', title: 'Demographics' },
  { type: 'note', title: 'Clinical Notes' },
  { type: 'result', title: 'Test Results' },
  { type: 'prescription', title: 'Prescriptions' },
]

export const ACTION_LABELS = {
  view_granted: 'View granted',
  view_denied: 'View denied',
  emergency_override: 'Emergency override',
}

export const ACTION_VARIANTS = {
  view_granted: 'granted',
  view_denied: 'denied',
  emergency_override: 'override',
}

/**
 * The check that refused, phrased for a human.
 *
 * These read as short explanations because they surface in the audit log's
 * Reason column on denied rows — the PDF asks the layer to hand the log which
 * check was failed, and "assignment" alone would mean nothing to a reader.
 */
export const FAILED_CHECK_LABELS = {
  authenticated: 'not signed in',
  role: 'role not permitted',
  ward: 'not in their ward',
  assignment: 'not assigned',
}

/**
 * Roles that can see no patient record at all.
 *
 * This mirrors the backend's `ROLE_RECORD_ACCESS` (see AUTHORIZATION.md) and
 * exists only to pick wording — an empty patient list means something
 * different for an admin than for a nurse with no patients, and saying "there
 * are no patients in Ward 7" would be a plain lie.
 *
 * It must never be used to decide what to show or hide: the API enforces
 * access, this only decides what sentence to print about it.
 */
export const ROLES_WITHOUT_PATIENT_ACCESS = new Set(['admin'])

export function hasPatientAccess(role) {
  return !ROLES_WITHOUT_PATIENT_ACCESS.has(role)
}
