# Design Spec — Patient Records Authorization Demo

This is not generic SaaS styling. It's built around one real fact: this is
software clinicians open when something urgent is happening, and it has to
look like it belongs in a hospital, not a startup landing page. Every choice
below is deliberate — follow it exactly, don't substitute defaults.

Stack: **React + Tailwind CSS**. You may use shadcn/ui as a base for
accessible primitives (dialogs, inputs) but override its default styling
completely with the tokens below — do not ship shadcn's default slate
palette or default rounded-corner-on-everything look.

---

## Design tokens

### Color
Only these colors. Do not introduce new ones per page.

| Token | Hex | Use |
|---|---|---|
| `bg` | `#F7F8FA` | page background — soft warm off-white, never pure white |
| `surface` | `#FFFFFF` | cards, table rows, panels |
| `ink` | `#1C2430` | primary text — soft near-black, never pure `#000` |
| `ink-muted` | `#5B6572` | secondary text, labels, meta |
| `border` | `#E2E5EA` | dividers, table borders, input borders |
| `primary` | `#2A5C8A` | clinical blue — buttons, links, active nav, focus rings |
| `primary-hover` | `#204769` | primary color on hover |
| `ward-teal` | `#3F7A72` | ward tags/badges |
| `granted` | `#2E7D53` | access granted state |
| `denied` | `#B5462F` | access denied / restricted state |
| `override` | `#C2410C` | emergency override — the ONLY place this color appears |

`override` is reserved. It must never be reused for anything else in the
app — its rarity is what makes it read as urgent.

### Typography
Two typefaces from the same family, so they cohere but stay distinct:
- **Headings:** IBM Plex Serif (institutional, not decorative)
- **Body / UI / tables:** IBM Plex Sans
- **Timestamps, IDs, log entries:** IBM Plex Mono (functional use only —
  never for regular labels)

Type scale (base 15px, not 16 — denser, more clinical-data-appropriate):
- Page title: 26px / Plex Serif / weight 600
- Section heading: 17px / Plex Serif / weight 600
- Body / table text: 15px / Plex Sans / weight 400
- Labels, meta: 13px / Plex Sans / weight 500
- Timestamps/IDs: 13px / Plex Mono

No ALL-CAPS labels anywhere. No single word in a headline picked out in
color or italics.

### Spacing & shape
- 8px base spacing unit. Card/section padding: 24px. Table cell padding:
  12px vertical, 16px horizontal.
- Border radius: 6px on inputs/buttons, 8px on cards. Not the generic
  16px "SaaS card" rounding, not sharp 0px either.
- Shadows: none, or a single 1px border instead. Flat, not floating.

---

## Layout — app shell

Left sidebar, fixed, 232px wide, `surface` background, right border
`border`:
```
┌────────────────┬──────────────────────────────────┐
│ [role badge]   │  Page title              [action] │
│ Dr. Amaka Obi   │  ──────────────────────────────── │
│ Doctor · Ward 3 │                                    │
│                 │  main content                      │
│ Patients        │                                    │
│ Audit Log (admin)│                                   │
│                 │                                    │
│ Sign out        │                                    │
└────────────────┴──────────────────────────────────┘
```
Role badge: small colored dot (color = role, pick one consistent color
per role) + name + role + ward, stacked, top of sidebar. This is always
visible so anyone watching the demo video instantly knows who's "logged
in" without you having to say it out loud.

---

## Page 1 — Login

Not a centered card on a gradient. Split screen:
- **Left half:** `primary` blue background, white text. A short line of
  copy: "Patient records, visible only to the people caring for that
  patient." Below it, a simple line-art icon (shield + person outline,
  single stroke weight, not a stock illustration).
- **Right half:** `bg` background, centered form: username, password,
  one button "Sign in" in `primary`. Labels above inputs, not
  placeholder-only text (placeholder-only labels disappear once typing
  starts and hurt usability).

This split layout doubles as your demo video's opening shot — it reads
as a real product in the first second, not a form.

---

## Page 2 — Patient list

Top of main content: page title "Patients", and directly under it in
`ink-muted`, one line of context: "Showing patients visible to you as
{role} on {ward}." — this single sentence is important, it's what makes
the access restriction visible and understandable rather than mysterious.

Below that: a plain table, not decorative cards.

| Patient | Ward | Status | |
|---|---|---|---|
| Chidinma Eze | Ward 3 · teal tag | Admitted | (small filled dot if assigned to you) |

Row hover: background shifts to `bg` (subtle), cursor pointer. Click
opens patient detail. Ward shown as a small pill using `ward-teal` at
15% opacity background, full color text — one consistent color per ward
name (pick 3-4 ward colors, keep them muted, not primary-saturated).

---

## Page 3 — Patient detail (the page the video lingers on)

Header: patient name (Plex Serif, 22px), ward pill, admitted status,
directly below.

Sections stacked vertically (no tabs — fewer clicks, one continuous
scroll):
- Demographics
- Clinical Notes
- Test Results
- Prescriptions

Each section is a card (`surface`, 1px `border`, 8px radius). If the
logged-in user is allowed to see it: normal content. If not: the card
still renders, but content is replaced with a small lock icon + "You
don't have access to this — role/ward/assignment check not met." in
`ink-muted` on a very light `denied`-tinted background (5% opacity).
Visible restriction, never a silently missing section — this is the
whole point of the demo.

**Emergency Override button:** top-right of the header, fixed there,
background `override`, white text, only button on the whole screen with
that color. Clicking it doesn't open a modal — it expands an inline
panel directly below the header (smooth height transition, ~200ms) with
a text input: "Reason for emergency access" + Confirm button. Once
confirmed: every restricted section above unlocks, and a full-width
banner appears at the very top of the page, `override` background,
white text: "Accessed via Emergency Override — reason: "{reason}" —
logged {timestamp}." This banner stays visible for the rest of that
page view. It is the single most visually loud moment in the entire
app — everything else stays calm specifically so this moment stands out.

---

## Page 4 — Audit log (admin only)

Plain table, newest first, no card wrapper — logs should look like
logs, not marketing content.

| Time | User | Patient | Action | Reason |
|---|---|---|---|---|
| Plex Mono, `ink-muted` | name + role | name | pill | text or — |

Action pill colors: `granted` (green), `denied` (red-orange), `override`
(amber) — same three tones as the rest of the app, no new colors
introduced on this page. This lets someone scanning the table pick out
every override at a glance, which is the point of a compliance/audit
screen: a viewer should be able to tell what matters within a few
seconds of looking at it.

Optional simple filter row above the table (by role or by action type)
— dropdown only, no complex date-range picker, not needed for a demo.

---

## States & interaction rules (apply everywhere)

- **Focus states:** every interactive element gets a visible 2px
  `primary`-colored outline on keyboard focus. Don't remove browser
  focus rings without replacing them.
- **Hover states:** subtle background tint only — no shadow "lift",
  no scale transform. Calm, not bouncy.
- **Loading states:** a simple text-based "Loading…" or a thin 2px
  progress bar in `primary` at the top of the content area — no
  spinning icons, no skeleton screens (unnecessary complexity for a
  5-page demo).
- **Empty/denied states:** always explain what happened and why, in
  plain language ("You don't have access to this because you're not
  assigned to this patient"), never a bare "No data" or a generic icon
  with no text.
- **Motion:** the only animated moment in the whole app is the
  Emergency Override panel expanding and the banner appearing. Nothing
  else animates on load, hover, or scroll. One deliberate moment reads
  as intentional; animating everything reads as a template.

---

## What NOT to do
- No gradient backgrounds anywhere.
- No default shadcn slate/zinc palette — every color must come from the
  token table above.
- No rounded pill buttons everywhere — only badges/tags are pill-shaped,
  buttons stay rectangular with 6px radius.
- No stock photography, no generic medical cross icons, no stethoscope
  clipart.
- No centered single-column marketing-style login card.