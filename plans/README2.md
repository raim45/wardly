# Patient Records Authorization Demo — Build Plan (v2)

Backend logic works. This version fixes data and UI quality using the
full 5-day / 120-hour budget properly. Read `DESIGN.md` — it specifies
every color, typeface, spacing value, and layout for every page. Follow
it exactly, don't substitute your own defaults.

---

## Tools
- **Database:** PostgreSQL
- **Backend:** Python + FastAPI, SQLAlchemy
- **Frontend:** React + Tailwind CSS (shadcn/ui allowed as a base for
  accessible primitives only — restyle everything per `DESIGN.md`,
  don't ship its default look)
- **Fonts:** IBM Plex Serif, IBM Plex Sans, IBM Plex Mono (Google Fonts)

---

## Rule for every stage
One task per stage. Don't touch files outside that stage's scope. After
finishing a stage, stop, look at the result yourself, and fix anything
that looks wrong before moving on — most stages deserve 2–3 rounds of
"look at it, list what's wrong, fix it" before you move to the next one.

---

## Stage 1 — Freeze the backend
No backend/API changes from here unless a stage says so. The problem is
data and UI, not logic.

## Stage 2 — Trim the fake data
Rewrite `seed.py`: 3–4 wards, 8–10 named patients, 6–8 users covering
every role, 2–3 records per patient. Real-sounding names. Re-run and
confirm the database looks right.

## Stage 3 — Verify the backend manually
Use FastAPI's `/docs` page to manually test every endpoint with a
couple of different users before writing any UI.

## Stage 4 — Build the design system first
Before any page: a small shared component set in code — Button, Badge,
Table, Card, Banner — built exactly to the tokens and rules in
`DESIGN.md`. This is what makes every later page look like one product
instead of four separate experiments. Review this stage the hardest —
everything else depends on it.

## Stage 5 — Login page
Per `DESIGN.md`. Build it, look at it, list what's off, fix, repeat
2–3 rounds.

## Stage 6 — Patient list page
Same process.

## Stage 7 — Patient detail + emergency override page
Same process. This is the page the demo video spends the most time on
— give it the most rounds of review.

## Stage 8 — Audit log page (admin only)
Same process.

## Stage 9 — Full manual test pass
Log in as each seeded user and confirm:
- a nurse only sees her ward's patients
- a doctor not assigned to a patient is denied
- restricted sections show as visibly restricted, not missing
- emergency override asks for a reason, unlocks access, shows the banner
- the audit log records every grant, denial, and override correctly

## Stage 10 — Record the demo video
1. Log in as a nurse — patient list limited to her ward.
2. Open a patient she's assigned to — show what she can/can't see.
3. Log in as a doctor not assigned to that patient — denied.
4. Same doctor — emergency override with a reason — access granted,
   banner shown.
5. Log in as admin — audit log — point out the denied attempt and the
   override entry with its reason.
   