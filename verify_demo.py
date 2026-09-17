"""Walks the demo script end to end against a running server.

    python -m uvicorn main:app --port 8000      # in one terminal
    python verify_demo.py                       # in another

This is README2 stage 9: log in as each role once and confirm the rules hold.
Exits non-zero if any check fails.
"""

import json
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8000"
PASSWORD = "demo"

failures = []


def call(method, path, user=None, body=None):
    """Returns (status, parsed-json-or-None)."""
    request = urllib.request.Request(f"{BASE}{path}", method=method)
    if user:
        request.add_header("X-User-Id", str(user["id"]))
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, data) as response:
            return response.status, json.loads(response.read() or "null")
    except urllib.error.HTTPError as error:
        raw = error.read()
        try:
            return error.code, json.loads(raw)
        except json.JSONDecodeError:
            return error.code, None


def login(username):
    status, body = call("POST", "/login", body={"username": username, "password": PASSWORD})
    assert status == 200, f"login failed for {username}: {status} {body}"
    return body


def check(label, actual, expected):
    ok = actual == expected
    print(f"  {'PASS' if ok else 'FAIL'}  {label}")
    if not ok:
        print(f"        expected: {expected!r}")
        print(f"        actual:   {actual!r}")
        failures.append(label)


def main():
    print("Signing in as each role...\n")

    chidinma = login("cokafor")   # nurse,    Ward 3, assigned to 2 of its 3 patients
    amaka = login("aobi")         # doctor,   Ward 3, NOT assigned to Halima Yusuf
    ifeoma = login("inwosu")      # lab_staff, Ward 3
    yusuf = login("ybello")       # records_clerk, Ward 4
    grace = login("gadeleke")     # admin,    Ward 7

    # --- the list is ward-scoped, and says which patients are actually assigned ---
    print("Nurse Chidinma Okafor (Ward 3)")
    _, nurse_patients = call("GET", "/patients", chidinma)
    nurse_names = sorted(p["name"] for p in nurse_patients)
    check("sees every patient in her ward",
          nurse_names, ["Bolanle Adesanya", "Emeka Nwosu", "Halima Yusuf"])
    check("every row is in her ward",
          {p["ward"] for p in nurse_patients}, {"Ward 3"})
    check("flagged as assigned only where she is assigned",
          sorted(p["name"] for p in nurse_patients if p["assigned"]),
          ["Emeka Nwosu", "Halima Yusuf"])
    check("a ward patient assigned to someone else is not flagged as hers",
          [p["assigned"] for p in nurse_patients if p["name"] == "Bolanle Adesanya"],
          [False])
    check("cannot see another ward at all",
          [p for p in nurse_patients if p["ward"] != "Ward 3"], [])

    halima_id = next(p["id"] for p in nurse_patients if p["name"] == "Halima Yusuf")

    # --- a patient in your ward you are not assigned to is refused on open ---
    bolanle_id = next(p["id"] for p in nurse_patients if p["name"] == "Bolanle Adesanya")
    status, body = call("GET", f"/patients/{bolanle_id}", chidinma)
    check("opening an unassigned ward patient is refused", status, 403)
    check("and the refusal names the assignment check",
          (body or {}).get("detail", "").endswith("not assigned to this patient"), True)

    # --- the role table narrows what shows on a patient she can open ---
    print("\n  Halima Yusuf's records, as a nurse")
    # Measured as a delta rather than a total, so rows left by an earlier run
    # do not make this fail.
    _, log_before = call("GET", "/audit-log", grace)
    status, detail = call("GET", f"/patients/{halima_id}", chidinma)
    _, log_after = call("GET", "/audit-log", grace)

    check("patient detail opens", status, 200)
    visible = {r["type"] for r in detail["records"] if r["allowed"]}
    restricted = {r["type"] for r in detail["records"] if not r["allowed"]}
    check("sees note and prescription", visible, {"note", "prescription"})
    check("test result and demographics are restricted",
          restricted, {"result", "admin_info"})
    check("restricted rows name the refusing check",
          {r["failed_check"] for r in detail["records"] if not r["allowed"]}, {"role"})
    check("restricted rows carry no content",
          all(r["content"] is None for r in detail["records"] if not r["allowed"]), True)

    # Opening a patient is ONE access attempt, however many records it holds.
    # Logging per record used to write four rows here, all at the same instant.
    check("opening a 4-record patient writes exactly one row",
          len(log_after) - len(log_before), 1)
    check("and that row is a grant for this patient",
          (log_after[0]["action"], log_after[0]["patient_name"]),
          ("view_granted", "Halima Yusuf"))

    # --- admin is a systems role: no patient access at all, per the PDF ---
    print("\nGrace Adeleke (admin) - records layer")
    _, admin_patients = call("GET", "/patients", grace)
    check("admin's patient list is empty", admin_patients, [])

    # --- a doctor in the right ward but unassigned is denied outright ---
    print("\nDr. Amaka Obi (Ward 3, not assigned to Halima Yusuf)")
    status, body = call("GET", f"/patients/{halima_id}", amaka)
    check("patient detail is refused", status, 403)
    check("refusal names the assignment check",
          "not assigned" in (body or {}).get("detail", ""), True)

    # --- lab staff see results and nothing else ---
    print("\nIfeoma Nwosu (lab_staff, assigned to Emeka Nwosu)")
    _, lab_patients = call("GET", "/patients", ifeoma)
    emeka_id = next(p["id"] for p in lab_patients if p["name"] == "Emeka Nwosu")
    _, lab_detail = call("GET", f"/patients/{emeka_id}", ifeoma)
    check("sees result only",
          {r["type"] for r in lab_detail["records"] if r["allowed"]}, {"result"})

    # --- records clerk never sees note or prescription (the PDF's example) ---
    print("\nYusuf Bello (records_clerk, Ward 4)")
    _, clerk_patients = call("GET", "/patients", yusuf)
    chidi_id = next(p["id"] for p in clerk_patients if p["name"] == "Chidi Okonkwo")
    _, clerk_detail = call("GET", f"/patients/{chidi_id}", yusuf)
    clerk_visible = {r["type"] for r in clerk_detail["records"] if r["allowed"]}
    check("sees admin_info only", clerk_visible, {"admin_info"})
    check("never sees note or prescription",
          clerk_visible & {"note", "prescription"}, set())

    # --- override: refuses an empty reason ---
    print("\nEmergency override")
    status, _ = call("POST", f"/patients/{halima_id}/override", amaka, body={"reason": "   "})
    check("blank reason is rejected", status, 400)

    status, _ = call("POST", f"/patients/{halima_id}/override", amaka, body={"reason": "x" * 201})
    check("an over-long reason is rejected", status, 422)

    status, _ = call("POST", f"/patients/{halima_id}/override", amaka, body={"reason": "x" * 200})
    check("a reason at the 200-character limit is accepted", status, 200)

    reason = "Patient collapsed in the corridor, no assigned doctor on site"
    status, override = call("POST", f"/patients/{halima_id}/override", amaka,
                            body={"reason": reason})
    check("override succeeds", status, 200)
    check("override flag set", override["override"], True)
    check("reason echoed back", override["override_reason"], reason)
    check("the banner timestamp comes from the server",
          bool(override.get("override_logged_at")), True)
    check("doctor now sees every record type Halima has",
          {r["type"] for r in override["records"] if r["allowed"]},
          {"note", "result", "prescription", "admin_info"})

    # --- override lifts ward and assignment, but NOT the role gate ---
    status, clerk_override = call("POST", f"/patients/{chidi_id}/override", yusuf,
                                 body={"reason": "Covering the records desk overnight"})
    check("a clerk can override into a patient", status, 200)
    check("but still cannot read the clinical note",
          {r["type"] for r in clerk_override["records"] if r["allowed"]}, {"admin_info"})

    # --- audit log: admin only, and it recorded everything above ---
    print("\nAudit log")
    status, _ = call("GET", "/audit-log", chidinma)
    check("a nurse cannot read the audit log", status, 403)

    status, entries = call("GET", "/audit-log", grace)
    check("admin can read the audit log", status, 200)

    actions = [e["action"] for e in entries]
    check("denied attempt was recorded", "view_denied" in actions, True)
    check("grants were recorded", "view_granted" in actions, True)

    # Asserted by reason rather than by count, so rows left by an earlier run or
    # a manual poke at /docs do not make this fail.
    override_reasons = {e["reason"] for e in entries if e["action"] == "emergency_override"}
    check("the doctor's override was recorded, with its reason",
          reason in override_reasons, True)
    check("the clerk's override was recorded, with its reason",
          "Covering the records desk overnight" in override_reasons, True)
    check("override rows kept their reason",
          any(e["reason"] == reason for e in entries), True)
    check("the refusal names the assignment check",
          any(e["failed_check"] == "assignment" for e in entries), True)
    check("no row is written without an action",
          all(e["action"] for e in entries), True)
    check("every row carries a patient",
          all(e["patient_name"] != "—" for e in entries), True)
    check("granted rows carry no failed_check",
          all(e["failed_check"] is None for e in entries if e["action"] == "view_granted"), True)
    check("override rows carry no failed_check",
          all(e["failed_check"] is None for e in entries
              if e["action"] == "emergency_override"), True)
    check("newest first",
          [e["id"] for e in entries] == sorted((e["id"] for e in entries), reverse=True), True)

    print()
    if failures:
        print(f"{len(failures)} check(s) FAILED:")
        for label in failures:
            print(f"  - {label}")
        raise SystemExit(1)
    print("All checks passed.")


if __name__ == "__main__":
    main()
