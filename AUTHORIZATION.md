# Authorization Layer

The authoritative spec is **`authorization_layer.pdf`** (Track C1: Safe Access to
Patient Records). This file records how that document was turned into code, and
flags the places where it is ambiguous or in tension with itself. Where this
file and the PDF disagree, the PDF wins — `authz.py` is the executable copy of
the table below.

The PDF calls its own role table "a starting point, not a final ruling". The
mapping below is the interpretation we are building against; it is worth a
review with someone who knows real ward workflows.

## The rule

`can_access(db, user, patient, record_type) -> bool` runs four checks in the
order the PDF gives them, and reports the first that fails:

| # | Check | `failed_check` value |
|---|---|---|
| 1 | Is the user logged in? | `authenticated` |
| 2 | Does the role ever see this record type? | `role` |
| 3 | Is the patient in the user's ward? | `ward` |
| 4 | Is there an `assignments` row for this user and patient? | `assignment` |

All four must pass. The PDF's framing — *"Role alone is not enough, and ward
alone is not enough"* — is the whole design.

## Role × record type

| role            | `note` | `result` | `prescription` | `admin_info` |
|-----------------|:------:|:--------:|:--------------:|:------------:|
| `doctor`        |   ✅   |    ✅    |      ✅        |     ✅       |
| `nurse`         |   ✅   |    ❌    |      ✅        |     ❌       |
| `lab_staff`     |   ❌   |    ✅    |      ❌        |     ❌       |
| `records_clerk` |   ❌   |    ❌    |      ❌        |     ✅       |
| `admin`         |   ❌   |    ❌    |      ❌        |     ❌       |

### How the PDF's prose became those cells

| role | PDF: "can normally see" | Maps to |
|---|---|---|
| `doctor` | "Full record of assigned/admitted patients: history, notes, results, prescriptions" | every record type — "full record" is read as including administrative data, and the PDF lists no record type a doctor is barred from |
| `nurse` | "Vitals, current medication, care notes for patients on their ward/shift" | `note` (care notes) + `prescription` (current medication) |
| `lab_staff` | "Test orders and results they are processing" | `result` |
| `records_clerk` | "Demographic and administrative info (name, ID, billing, appointments)" | `admin_info` |
| `admin` | "Account and system logs" | **nothing** — its access is the audit log, not the records tables |

Two cells are interpretations rather than transcriptions, and are the ones to
challenge first:

- **Nurse loses `result`.** The PDF lists "Full diagnostic history" under what a
  nurse *cannot* see. We read that as excluding test results generally. If the
  intent was to exclude only historical or other-ward diagnostics while
  allowing a current result, this cell flips to ✅ and the demo patient shows
  3 visible / 1 restricted instead of 2 / 2.
- **Doctor keeps `admin_info`.** The PDF never lists administrative data for a
  doctor, but it never bars it either, and "full record" is broad.

**`admin` having an empty row is the most visible consequence.** An admin
therefore has an empty patient list, and `GET /patients` returns `[]` for them.
That is the correct behaviour under the PDF's model — Admin/IT is a systems
role whose screen is the audit log — not a rendering bug to be "fixed" later.

## Two layers, deliberately separate

The checks are not one gate but two, and the demo depends on not conflating
them:

| Layer | Checks | Failure looks like |
|---|---|---|
| **Patient-level** | 1, 3, 4 | `403` — "you may not open this patient" |
| **Record-level** | 2 | that section renders as visibly restricted |

So a nurse assigned to a patient sees the page, with Test Results and
Administrative sections rendered as restricted cards. A doctor in the right ward
with no assignment gets a flat `403` and never sees the page at all.

`can_access` runs all four because the PDF orders them as one sequence. The
endpoint additionally evaluates the patient-level gate on its own, so it can
choose between `403` and a page of restricted sections.

### Why `GET /patients` is ward-scoped, not assignment-scoped

The list endpoint returns **every patient in the user's ward**, each carrying an
`assigned` flag, rather than only the patients they are assigned to.

This makes the two checks separately visible. A patient in your ward you are not
assigned to still appears in the list — the assignment dot is empty against
their name — and opening them is refused with the assignment reason. If the list
were assignment-filtered instead, every row would be assigned, the dot would
carry no information, and the assignment check would only ever be encountered by
navigating to a patient URL directly.

The one exception is a role that can see no record type at all: `admin` gets an
empty list, because a ward's worth of patients whose every section is restricted
would be a screen with nothing on it. Its access is the audit log.

## Emergency override

`POST /patients/{id}/override` requires a non-empty reason of at most 200
characters — the PDF's "one-line reason", enforced server-side rather than only
by the input field's `maxlength`.

- **Skips:** checks 3 and 4 (ward and assignment) — the PDF: *"bypassing the
  ward/assignment checks above"*.
- **Still enforces:** check 2 (role) — the PDF: *"still requires normal login
  (role and identity are never skipped)"*.
- **Logs:** one `emergency_override` row carrying the reason.

The role gate still applies because an override is a statement about *this
patient being an emergency*, not about the user becoming a different kind of
employee.

### A tension in the PDF worth settling

The Admin/IT row says admin cannot see patient clinical content **"unless
explicitly escalated"** — which implies escalation *can* grant admin clinical
access. But the override section says overrides never skip the role check. Both
cannot hold for the admin role at once.

We implemented the override section, because it describes the mechanism
explicitly rather than by implication, so **today an admin override still
reveals no clinical content**. If "explicitly escalated" was meant to be a
second, stronger path than break-glass, that is a new concept the PDF does not
otherwise define, and it needs deciding before it can be built.

## What this layer hands the audit log

Per the PDF's handoff section, every attempt records: who, which patient record,
which check passed or failed, whether it was normal or an override, and when.
That is why `access_log` carries a structured `failed_check` column (`NULL` when
granted) rather than burying the answer in prose — it lets the audit screen
group and filter on the refusing check. `reason` is overrides-only.

### Granularity: one row per access attempt

The unit of logging is **the access attempt**, not the record. Opening a
four-record patient writes one row, not four.

This was originally the other way round, on the reading that "log every check"
meant every record-type check. In practice it wrote four near-identical rows
sharing a timestamp for a single page view, which made the audit screen — the
one whose entire job is to be scannable — unreadable. The PDF's wording is
"for every access attempt", and the attempt is opening the patient.

Two consequences worth knowing:

- **A role refusal is not a logged event.** When the role table withholds a
  section, nothing was asked for and nothing was refused: the row simply was not
  included. The restriction is visible on screen, but it is a filtering
  decision, not an access attempt. So `failed_check = 'role'` does not arise
  from viewing a patient; it would only arise if a record could be requested
  individually. `failed_check` in practice carries `ward` or `assignment` — the
  two checks that refuse the *attempt*.
- **Overrides log once**, as `emergency_override`, with their reason — not once
  per record revealed. No endpoint writes more than one row per request.

If per-record auditing is ever wanted — for a real compliance regime, saying
exactly which fields a clinician read — that is a different feature and needs
its own decision about volume, not a quiet revert of this one.

## Known simplifications

1. **One ward per user.** `users.ward` is a single string, so a lab tech who
   covers the whole hospital cannot be expressed. The PDF's "unrelated
   departments" cannot be modelled either.
2. **No time bounds on assignment.** An `assignments` row means "currently
   responsible", with no start or end date. This is the PDF's own open question
   — *"How do we define 'assigned' in our prototype data?"* — answered for now
   with the simplest thing that works.
3. **No supervisor view.** The PDF asks for overrides to be "visible to a
   supervisor in something close to real time". Nothing implements this; the
   audit log is the only surface, and only an admin can read it.
4. **Passwords are plaintext.** Prototype only.
5. **`is_admitted` does not affect authorization.** It is displayed, and nothing
   more.
6. **No transfer handling.** The PDF asks what happens when a patient moves ward
   mid-shift. Today the ward check is evaluated live, so access follows the new
   ward immediately — but nothing records that the old ward ever had it.

## Open questions carried forward from the PDF

Unresolved, and deliberately left that way rather than silently decided:

- How to define "assigned" in the prototype data.
- Do records clerks need read access to anything clinical at all, even redacted?
- What happens when a patient is transferred mid-shift?
- Who counts as a "supervisor" for reviewing overrides in the demo?
- Does "unless explicitly escalated" for admin mean a second access path?
