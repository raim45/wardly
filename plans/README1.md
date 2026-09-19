# Patient Records Authorization Demo — Build Plan

> **Status: built and passing.** Day 1 and Day 2 are done. The plan below is
> kept as written; see "Running it" for how to start it.

## Running it

PostgreSQL 18 is installed locally. The `hospital_demo` database exists and is
seeded with the fake data described below.

Two processes — the API and the React frontend:

```bash
pip install -r requirements.txt
python seed.py                            # create tables + fake data (re-runnable)
python -m uvicorn main:app --port 8000    # API + /docs

cd frontend && npm install && npm run dev # UI on http://localhost:5173/
```

Open **http://localhost:5173/**. Vite proxies `/login`, `/patients` and
`/audit-log` to the API on :8000, so the frontend uses same-origin relative URLs
exactly as it will in production.

The connection string defaults to
`postgresql+psycopg2://postgres:postgres@localhost:5432/hospital_demo`; override
it with the `DATABASE_URL` environment variable.

Every demo account uses the password `demo`. The useful ones for the demo
script are `cokafor` (nurse, Ward 3), `aobi` (doctor, Ward 3, not assigned to
the demo patient) and `gadeleke` (admin).

Before recording, confirm it all still behaves:

```bash
python verify_demo.py                    # walks the demo script end to end, 40 checks
python check_design.py                   # every page against DESIGN.md's rules
python check_design.py audit             # or just one page
python shoot_demo.py                     # screenshots/ (superseded: drives the old v1 UI)
```

`seed.py` drops and recreates every table, so re-run it to clear the audit log
back to empty before you record.

### Files

| File | What it is |
|---|---|
| `DESIGN.md` | The design spec — tokens, type scale, and every page's layout |
| `AUTHORIZATION.md` | How `authorization_layer.pdf` became code, and where it is ambiguous |
| `authorization_layer.pdf` | The original spec for the authorization layer |
| `authz.py` | `can_access()` — the core authorization function |
| `models.py` | SQLAlchemy models; the single source of truth for the schema |
| `db.py` | Connection and session setup |
| `main.py` | FastAPI endpoints |
| `seed.py` | Fake data |
| `frontend/` | The React + Tailwind UI (see `frontend/src/components/`) |
| `verify_demo.py` | End-to-end check of the access rules |
| `check_design.py` | Checks each page against `DESIGN.md` |
| `static/` | **Superseded** — the v1 plain-HTML UI, kept only for reference |

### One deviation from the plan below

Step 3 asks for `can_access(user, patient, record_type)`. The assignment check
needs a database session, so the real signature is
`can_access(db, user, patient, record_type)`.

---

Goal: a small working demo (not a real product) that shows an authorization
layer deciding who can see which patient record, with an emergency override
and an audit log. Backend must be real and correct. UI must be simple —
just enough to click through and record a demo video.

Time budget: 2 days.

---

## Tools to use (keep it this simple, don't add more)

- **Database:** PostgreSQL
- **Backend:** Python + FastAPI
- **Backend DB access:** SQLAlchemy (or plain SQL with psycopg2 if that's faster for you)
- **Frontend:** plain HTML + CSS + vanilla JavaScript (no React, no build step —
  just static files the backend serves, calling the API with `fetch`)
- **Auth for the demo:** a simple login form (username + password checked
  against the `users` table) — no need for real password hashing security,
  this is a prototype. Store the logged-in user in a cookie or just in the
  browser's `localStorage` and send it with each request.

Do not add a frontend framework, Docker, microservices, or anything beyond
this list. The point is a working demo in 2 days, not production software.

---

## Day 1 — Database + Backend

### Step 1: Set up the database
Create a Postgres database called `hospital_demo` with these tables:

- `users` — id, name, username, password, role (`doctor`, `nurse`,
  `lab_staff`, `records_clerk`, `admin`), ward
- `patients` — id, name, ward, is_admitted
- `assignments` — id, patient_id, user_id (who is currently responsible
  for this patient)
- `records` — id, patient_id, type (`note`, `result`, `prescription`,
  `admin_info`), content
- `access_log` — id, user_id, patient_id, action (`view_granted`,
  `view_denied`, `emergency_override`), reason (nullable, only used for
  overrides), timestamp

### Step 2: Seed fake data
Write one script (`seed.py`) that fills the tables with made-up data:
- ~10 users covering every role
- ~15 patients spread across 3–4 wards
- assignments linking some (not all) users to some patients
- a few records per patient
- run this script once to populate the database, keep it re-runnable
  (clear tables first, then insert)

### Step 3: Build the authorization function
This is the core of the project — write it as one function, e.g.
`can_access(user, patient, record_type) -> True/False`, that checks in
order:
1. Is the user logged in? (always true here, request already has a user)
2. Does the user's `role` ever get to see this `record_type`? (use the
   table from the authorization_layer document — e.g. records_clerk
   never sees `note` or `prescription`)
3. Is the patient in the user's `ward`?
4. Is there an `assignments` row linking this user to this patient?

If all four pass → allow. If any fail → deny.

### Step 4: Build the API endpoints
- `POST /login` — checks username/password, returns the user
- `GET /patients` — list of patients the logged-in user is allowed to see
  something about (used for the patient list screen)
- `GET /patients/{id}` — full patient detail; for each record, run
  `can_access`; only include records that pass; log every check (granted
  or denied) into `access_log`
- `POST /patients/{id}/override` — emergency access: requires a `reason`
  field in the body, skips the ward/assignment checks, still logs it
  (as `emergency_override`, with the reason saved)
- `GET /audit-log` — returns the `access_log` table, newest first
  (only role `admin` can call this)

Test these with the FastAPI auto-docs page (`/docs`) before building the UI.

---

## Day 2 — Frontend + Demo Polish

### Step 5: Login page
One HTML page with a username/password form. On success, save the user
info and redirect to the patient list page.

### Step 6: Patient list page
Shows patients the logged-in user can see, pulled from `GET /patients`.
Click a patient to open their detail page.

### Step 7: Patient detail page
Shows the patient's records. Records the user isn't allowed to see just
don't appear (or show a greyed-out "Restricted" line — this makes a
better demo than simply omitting them). Include a red "Emergency
Override" button that asks for a one-line reason (a simple `prompt()`
or small text box is fine) and then calls `POST /patients/{id}/override`,
after which the full record shows with a visible "ACCESSED VIA EMERGENCY
OVERRIDE" banner.

### Step 8: Audit log page
Only reachable when logged in as the `admin` user. A simple table showing
every row from `access_log` — who, patient, action, reason, timestamp.
This is the screen that proves the whole thing is being recorded.

### Step 9: Walk through the demo yourself before recording
Log in as each role once and confirm:
- a nurse sees only their ward's patients
- a doctor not assigned to a patient is denied
- the emergency override works and shows up in the audit log
- the admin audit log page shows everything correctly

---

## Suggested demo video script (once it works)

1. Log in as a nurse — show the patient list is limited to her ward.
2. Open a patient she's assigned to — show what she can and can't see.
3. Log in as a doctor not assigned to that patient — try to open it,
   show it's denied.
4. Same doctor — use Emergency Override with a reason, show access is
   now granted and flagged.
5. Log in as admin — open the audit log, point out the denied attempt
   and the override entry with its reason.

That's the whole story: role + ward + assignment controls access,
overrides are possible but never invisible.