# Patient Records Authorization Demo

A working prototype of the authorization layer that decides **who may see which
part of a patient record** — and an audit log that records every decision,
granted or denied, including emergency overrides.

The authoritative spec is `Hackathon Authorization Layer.pdf` (Track C1: *Safe
Access to Patient Records*). This is not production software. The point is that
the access rules are real, correct, and inspectable: real database, real API,
real checks, and a screen that proves every access was recorded.

**Status:** backend frozen, UI complete, 43 end-to-end checks passing.

---

## The problem being demonstrated

A hospital record system has to answer one question thousands of times a day:
*may this person see this?* The naive answers are all wrong.

- **Role alone is not enough.** Every nurse works somewhere, but a nurse on
  Ward 3 has no business reading a patient on Ward 7.
- **Ward alone is not enough.** A ward holds more patients than any one
  clinician is responsible for.
- **Hiding what you can't see is not enough.** A silently missing section looks
  like a bug. The demo shows restriction *visibly*.
- **Denying in an emergency is not enough.** A clinician with a crashing patient
  needs a way through — but one that leaves a mark.

The app makes those four tensions the visible content of the screen.

---

## Quick start

Two processes: the API and the React frontend.

```bash
pip install -r requirements.txt
python seed.py                            # create tables + fake data (re-runnable)
python -m uvicorn main:app --port 8000    # the API

cd frontend && npm install && npm run dev # the UI on http://localhost:5173/
```

Open **http://localhost:5173/**.

`:8000` serves the API only — no HTML. Its `/docs` page (FastAPI's auto-generated
Swagger UI) is live and is the right place to poke at the API by hand. Vite
proxies `/login`, `/patients` and `/audit-log` to it, so the frontend uses
same-origin relative URLs exactly as it would in production.

The connection string defaults to
`postgresql+psycopg2://postgres:postgres@localhost:5432/hospital_demo`; override
it with the `DATABASE_URL` environment variable.

`seed.py` drops and recreates every table, so re-run it to reset the audit log
to empty before recording or demoing.

### Accounts

Every account uses the password **`demo`**. There are 8 users across 3 wards.
The three the demo script turns on:

| Username | Who | Role | Ward | Why they matter |
|---|---|---|---|---|
| `cokafor` | Nurse Chidinma Okafor | `nurse` | Ward 3 | Assigned to 2 of her ward's 3 patients — so one row in her list has an empty assignment dot |
| `aobi` | Dr. Amaka Obi | `doctor` | Ward 3 | In the right ward, but **not** assigned to Halima Yusuf — so opening her fails on the assignment check alone |
| `gadeleke` | Grace Adeleke | `admin` | Ward 7 | Reads the audit log; has **no** patient record access at all |

The others: `tbakare` (doctor, W3), `neze` (doctor, W7), `sadeyemi` (nurse, W4),
`inwosu` (lab_staff, W3), `ybello` (records_clerk, W4).

Halima Yusuf (Ward 3) is the demo patient. She is the only patient carrying all
four record types, so her detail page renders all four sections at once — which
is what makes the role table, and then the override, visible in one screen.

---

## The authorization model

This is the core of the project. Everything else exists to make it visible.

### Four checks, in order

`can_access(db, user, patient, record_type)` runs the PDF's four checks in the
PDF's order and reports the first that fails:

| # | Check | `failed_check` value |
|---|---|---|
| 1 | Is the user logged in? | `authenticated` |
| 2 | Does the role ever see this record type? | `role` |
| 3 | Is the patient in the user's ward? | `ward` |
| 4 | Is there an `assignments` row for this user and patient? | `assignment` |

All four must pass. The one signature deviation from the build plan:
`can_access(user, patient, record_type)` gained a leading `db` argument, because
the assignment check needs a session to resolve.

`authz.py` returns a `Decision(allowed, failed_check, reason)` rather than a bare
boolean, so callers can say *which* check refused, not just that one did. That
structured `failed_check` is what the audit log groups and filters on.

### Role × record type

| role | `note` | `result` | `prescription` | `admin_info` |
|---|:--:|:--:|:--:|:--:|
| `doctor` | ✅ | ✅ | ✅ | ✅ |
| `nurse` | ✅ | ❌ | ✅ | ❌ |
| `lab_staff` | ❌ | ✅ | ❌ | ❌ |
| `records_clerk` | ❌ | ❌ | ❌ | ✅ |
| `admin` | ❌ | ❌ | ❌ | ❌ |

Two of those cells are interpretation rather than transcription, and are the
ones to challenge first:

- **Nurse loses `result`.** The PDF lists "full diagnostic history" under what a
  nurse *cannot* see; we read that as excluding test results generally. If the
  intent was to exclude only historical or other-ward diagnostics while allowing
  a current result, this cell flips and the demo patient shows 3 visible / 1
  restricted instead of 2 / 2.
- **Doctor keeps `admin_info`.** The PDF never lists administrative data for a
  doctor, but never bars it either, and "full record" is broad.

**`admin` having an empty row is the most visible consequence**, and it is
deliberate. The PDF scopes Admin/IT to "account and system logs" and bars it from
clinical content, so an admin's access lives entirely in the audit log — their
patient list renders empty because there is genuinely nothing on it they may
read. That is the rule working, not a rendering bug to be "fixed" later.

`AUTHORIZATION.md` walks the PDF's prose into those cells one role at a time.

### Two layers, deliberately separate

The checks are not one gate but two, and the demo depends on not conflating them:

| Layer | Checks | A failure looks like |
|---|---|---|
| **Patient-level** | 1, 3, 4 | `403` — "you may not open this patient" |
| **Record-level** | 2 | that section renders as a visibly restricted card |

So a nurse assigned to Halima sees the page, with Test Results and Demographics
rendered as restricted cards. A doctor in the right ward **without** an
assignment gets a flat `403` and never sees the page at all.

That difference is the whole design in one comparison: the same screen shows
"here is a patient you're responsible for, minus the parts that aren't yours"
and "this patient isn't yours to open."

### Why `GET /patients` is ward-scoped, not assignment-scoped

The list returns **every patient in the user's ward**, each carrying an
`assigned` flag, rather than only the patients they are assigned to.

This makes the two checks separately visible. A patient in your ward you are not
assigned to still appears — the assignment dot next to their name is empty — and
opening them is refused with the assignment reason. If the list were
assignment-filtered, every row would be assigned, the dot would carry no
information, and the assignment check would only ever be met by typing a URL.

The one exception is a role that can see no record type at all — `admin` gets an
empty list, because a ward's worth of patients whose every section is restricted
would be a screen with nothing on it.

### Emergency override

`POST /patients/{id}/override` requires a non-empty reason of at most 200
characters — the PDF's "one-line reason", enforced server-side rather than only
by the input's `maxlength`. A blank-but-present reason is a `400`; an over-long
one is a `422`.

- **Skips:** checks 3 and 4 — the PDF: *"bypassing the ward/assignment checks
  above."*
- **Still enforces:** check 2 — the PDF: *"still requires normal login (role and
  identity are never skipped)."*
- **Logs:** one `emergency_override` row carrying the reason.

The role gate still applies because an override is a statement about *this
patient being an emergency*, not about the user becoming a different kind of
employee. A records clerk who breaks the glass on a patient still cannot read the
clinical note — and `verify_demo.py` asserts exactly that.

**A tension in the PDF worth settling.** The Admin/IT row says admin cannot see
clinical content *"unless explicitly escalated"*, which implies escalation *can*
grant clinical access. But the override section says overrides never skip the role
check. Both cannot hold for `admin` at once. We implemented the override section,
because it describes the mechanism explicitly rather than by implication — so
today an admin override still reveals no clinical content. If "explicitly
escalated" was meant to be a second, stronger path than break-glass, that is a
concept the PDF does not otherwise define, and it needs deciding before it can be
built.

---

## The audit log

`GET /audit-log`, admin only. Every attempt records who, which patient, which
check passed or failed, whether it was normal or an override, and when.

**Granularity: one row per access attempt, not per record.** Opening a
four-record patient writes one row, not four.

This was originally the other way round, on the reading that "log every check"
meant every record-type check. In practice it wrote four near-identical rows
sharing a timestamp for a single page view, which made the audit screen — the
one whose entire job is to be scannable — unreadable. The PDF's wording is "for
every access attempt", and the attempt is opening the patient.

Two consequences worth knowing:

- **A role refusal is not a logged event.** When the role table withholds a
  section, nothing was asked for and nothing was refused — the row simply was not
  included. The restriction is visible on screen, but it is a filtering decision,
  not an access attempt. So `failed_check = 'role'` does not arise from viewing a
  patient; in practice it carries `ward` or `assignment`, the two checks that
  refuse the *attempt*.
- **Overrides log once**, as `emergency_override`, with their reason — not once
  per record revealed. No endpoint writes more than one row per request.

A related fix lives on the client: React StrictMode runs effects twice in
development, which fired two requests per page view — and since reads are
audited, that wrote two identical rows for one visit. The server cannot tell a
double-fetch from two genuine visits, so `frontend/src/lib/api.js` collapses
concurrent identical reads into one in-flight request. A duplicated audit trail
is worse than a slow one.

If per-record auditing is ever wanted — for a real compliance regime, saying
exactly which fields a clinician read — that is a different feature and needs its
own decision about volume, not a quiet revert of this one.

---

## Architecture

```
┌──────────────────────────┐        ┌──────────────────────────┐
│  React 19 + Tailwind 4   │  HTTP  │  FastAPI                 │
│  Vite dev server :5173   │ ─────► │  uvicorn :8000           │
│  hash routing, no router │        │  authz.py — the four     │
│  localStorage session    │        │  checks                  │
└──────────────────────────┘        └────────────┬─────────────┘
                                                 │ SQLAlchemy 2.x
                                                 ▼
                                    ┌──────────────────────────┐
                                    │  PostgreSQL 18           │
                                    │  hospital_demo           │
                                    └──────────────────────────┘
```

| Layer | Choice | Note |
|---|---|---|
| Database | PostgreSQL 18 | via `psycopg2-binary` |
| ORM | SQLAlchemy 2.x | models are the single source of truth; there is no `.sql` file to drift |
| API | FastAPI + uvicorn | 5 endpoints, plus `/docs` for free |
| UI | React 19 + Vite 8 + Tailwind CSS 4 | CSS-first `@theme` tokens, no component library |
| Routing | hand-rolled hash router, ~40 lines | no `react-router` for four routes |
| Auth | `X-User-Id` header from `localStorage` | see "Known limitations" |
| Fonts | IBM Plex Serif / Sans / Mono | via Google Fonts |

### Data model

Five tables, defined in `models.py`:

- **`users`** — id, name, username, password, `role`, `ward`
- **`patients`** — id, name, `ward`, `is_admitted`
- **`assignments`** — id, `patient_id`, `user_id`. A row means "currently
  responsible". No start or end date.
- **`records`** — id, `patient_id`, `type`, `content`
- **`access_log`** — id, `user_id`, `patient_id`, `action`, `failed_check`,
  `reason`, `timestamp`. Append-only.

`access_log.failed_check` is the one column that departs from the v1 build plan,
and it earns its place: it carries *which of the four checks refused* as a
structured value the audit screen can group and filter on, rather than burying
the answer in prose. It is `NULL` when access was granted. `reason` stays
overrides-only, as the plan specified — a denial's explanation is
`failed_check`, not a sentence.

The demo data is 3 wards (Ward 3, 4, 7), 9 patients at 3 per ward, 8 users
covering every role, 11 assignments, and 23 records. The assignment gaps are
placed deliberately; `seed.py` documents which gap the demo turns on.

### API

| Method | Path | Who | What it does |
|---|---|---|---|
| `POST` | `/login` | anyone | Username + password → user record. Same error message either way, so it does not reveal which usernames exist. |
| `GET` | `/patients` | any signed-in user | Every patient in the user's ward, each with an `assigned` flag. `[]` for a role with no record access. |
| `GET` | `/patients/{id}` | any signed-in user | Patient detail. Runs the patient gate (403 on failure, logged), then the record gate per section. Logs one `view_granted`. |
| `POST` | `/patients/{id}/override` | any signed-in user | Emergency access. Skips ward + assignment, keeps the role gate, logs `emergency_override` with the reason. |
| `GET` | `/audit-log` | `admin` only | The whole `access_log`, newest first. |

Denied records keep their `type` but never their `content` — the UI needs to know
a row is restricted, and which check restricted it, in order to draw the
restricted card. Nothing more than that is exposed to a client that may not read
it.

### Frontend

`plans/DESIGN.MD` is the spec — tokens, type scale, and every page's layout — and
it is followed exactly rather than approximated. The relevant analysis is that
the design is doing an argument's work, not decoration:

- **`override` (#C2410C) is reserved.** It appears in exactly one place in the
  entire app — the override button and the banner it produces. Its rarity is what
  makes it read as urgent.
- **The only animation in the app** is the override panel expanding and the
  banner appearing. Everything else is static by rule. One deliberate moment
  reads as intentional; animating everything reads as a template.
- **Restricted sections still render**, as a lock icon and a sentence on a 5%
  `denied` tint. Visible restriction rather than a silently missing section is
  the entire point of the demo.
- **The sidebar role badge is always visible** — name, role, ward — so anyone
  watching the demo knows who is "logged in" without being told.

Built as a shared component set first (Stage 4), so every page looks like one
product rather than four experiments: `Button`, `Badge`/`WardBadge`, `Card`/
`RestrictedCard`, `Table`, `Banner`/`Notice`/`OverrideBanner`, `Type`/`Timestamp`,
`Input`/`Field`/`Select`, `AppShell`/`PageHeader`, `Progress`. `#/kitchen` renders
all of them on one page for review.

---

## Verifying it

```bash
python verify_demo.py     # 43 checks: walks the whole demo script end to end
python check_design.py    # every page against DESIGN.md's rules
python check_design.py audit   # or just one page
```

`verify_demo.py` needs the API running on `:8000`. It signs in as each role and
asserts the rules hold — ward scoping, the assignment refusal, the role table per
role, override success and its limits, and what did and did not reach the audit
log. It asserts **deltas rather than absolute counts** (rows added by this run,
overrides found by reason), so a log left dirty by an earlier run or a manual
poke at `/docs` does not produce a false failure. Exits non-zero if anything
fails.

`check_design.py` drives Chrome via Playwright (`channel="chrome"`, so nothing
has to be downloaded) against each page and checks the tokens, type scale, and
layout rules `DESIGN.md` specifies.

---

## Repository layout

| Path | What it is |
|---|---|
| `authz.py` | **The authorization layer.** The role table and the four checks. Start here. |
| `models.py` | SQLAlchemy models — the schema's single source of truth |
| `db.py` | Connection and session setup |
| `main.py` | The five FastAPI endpoints |
| `seed.py` | Fake data; re-runnable, drops and recreates every table |
| `frontend/src/` | React + Tailwind UI. `components/` is the design system, `pages/` the four screens, `lib/` the router, API client and label maps |
| `verify_demo.py` | 43-check end-to-end pass over the access rules |
| `check_design.py` | Per-page compliance with `plans/DESIGN.MD` |
| `AUTHORIZATION.md` | **How the PDF became code, and where it is ambiguous.** Read with `authz.py`. |
| `Hackathon Authorization Layer.pdf` | The original spec for the authorization layer |
| `plans/DESIGN.MD` | The design spec — tokens, type scale, every page's layout |
| `plans/README1.md` | Build plan v1 (2-day version), kept for provenance |
| `plans/README2.md` | Build plan v2 (5-day version) — the stages actually followed |
| `test_override_interaction.py` | Focused Playwright pass over the override panel: denial → override reason → banner. Needs both processes running |

---

## Known limitations

Deliberate simplifications, not oversights. Each is the simplest thing that
demonstrates the rule.

1. **Authentication is not authentication.** The session is a user id in
   `localStorage` sent as an `X-User-Id` header — trivially forgeable, and meant
   to be. It establishes *identity for the demo*, not *proof of identity*. Real
   auth would not change a single line of `authz.py`, which is the point of
   keeping the two apart.
2. **Passwords are plaintext** and all set to `demo`. Prototype only.
3. **One ward per user.** `users.ward` is a single string, so a lab tech who
   covers the whole hospital cannot be expressed, and the PDF's "unrelated
   departments" cannot be modelled.
4. **No time bounds on assignment.** An `assignments` row means "currently
   responsible" with no start or end date — the PDF's own open question, answered
   for now with the simplest thing that works.
5. **No supervisor view.** The PDF asks for overrides to be "visible to a
   supervisor in something close to real time". Nothing implements this. The
   audit log is the only surface, and only an admin can read it.
6. **No transfer handling.** The PDF asks what happens when a patient moves ward
   mid-shift. The ward check is evaluated live, so access follows the new ward
   immediately — but nothing records that the old ward ever had it.
7. **`is_admitted` does not affect authorization.** It is displayed, and nothing
   more.
8. **The UI and the API are two processes.** `main.py` serves no HTML at all, so
   running the demo means uvicorn on `:8000` *and* Vite on `:5173`. Building the
   React app and mounting `frontend/dist` from FastAPI would collapse it to one
   process, at the cost of requiring a build before every run — a fair trade for
   a submission, and not one taken here. The v1 plain-HTML frontend that used to
   be mounted at `/` has been removed.

## Open questions carried forward from the PDF

Unresolved, and deliberately left that way rather than silently decided:

- How to define "assigned" in the prototype data.
- Do records clerks need read access to anything clinical at all, even redacted?
- What happens when a patient is transferred mid-shift?
- Who counts as a "supervisor" for reviewing overrides in the demo?
- Does "unless explicitly escalated" for `admin` mean a second access path?

---

## The demo script

Worth walking before recording, and the story `verify_demo.py` encodes:

1. **Sign in as Nurse Chidinma Okafor** (`cokafor`) — the patient list holds her
   ward's three patients and nothing else, and one row's assignment dot is empty.
2. **Open Halima Yusuf** — two sections have content, two render as visibly
   restricted. The restriction is on screen, not missing.
3. **Try to open Bolanle Adesanya** — refused on the assignment check, in plain
   language.
4. **Sign in as Dr. Amaka Obi** (`aobi`) — right ward, wrong assignment. Opening
   Halima is a flat `403`; the page never renders at all.
5. **Use Emergency Override** with a reason — every restricted section unlocks
   and the banner appears with the reason and a server timestamp.
6. **Sign in as Grace Adeleke** (`gadeleke`) — the audit log, newest first, shows
   the denial, the grants, and the override with its reason. Her own patient list
   is empty, because an admin has no patient record access.

That is the whole argument: role + ward + assignment decide who sees what,
overrides are possible, and nothing is invisible.
