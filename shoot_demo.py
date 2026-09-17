"""Screenshots the demo flow using the Chrome already installed on this machine.

    python -m uvicorn main:app --port 8000      # in one terminal
    python shoot_demo.py                        # in another

Writes PNGs into screenshots/. Development helper only — not part of the app.
"""

import pathlib

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8000"
OUT = pathlib.Path("screenshots")
OUT.mkdir(exist_ok=True)

SHOTS = []


def shot(page, name):
    path = OUT / f"{name}.png"
    page.screenshot(path=str(path), full_page=True)
    SHOTS.append((name, path))
    print(f"  wrote {path}")


def sign_in(page, username):
    # The login page bounces straight to the list if localStorage still holds a
    # user, so switch accounts by clearing it first.
    page.goto(f"{BASE}/")
    page.evaluate("localStorage.clear()")
    page.goto(f"{BASE}/")
    page.fill("#username", username)
    page.fill("#password", "demo")
    page.click("#submit")
    page.wait_for_url("**/patients.html")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        page = browser.new_page(viewport={"width": 1180, "height": 900})
        errors = []

        def note_error(text):
            # A missing favicon is noise, not a failure.
            if "favicon" not in text:
                errors.append(text)

        page.on("pageerror", lambda e: note_error(str(e)))
        page.on("console", lambda m: note_error(f"console.{m.type}: {m.text}")
                if m.type == "error" else None)

        # 1. Login
        page.goto(f"{BASE}/")
        page.click("details.demo-accounts summary")   # show the account picker
        shot(page, "1-login")

        # 2. Nurse: ward- and assignment-filtered list
        sign_in(page, "cokafor")
        page.wait_for_selector("#rows tr")
        shot(page, "2-nurse-patient-list")

        # 3. Nurse: assigned patient, one record type restricted
        page.click("#rows tr:first-child a")
        page.wait_for_selector(".record")
        shot(page, "3-nurse-record-view")

        # 4. Doctor unassigned to that patient: refused
        sign_in(page, "aobi")
        page.goto(f"{BASE}/patient.html?id=1")
        page.wait_for_selector(".denied-banner")
        shot(page, "4-doctor-denied")

        # 5. Same doctor, emergency override
        page.fill("#override-reason", "Patient collapsed in the corridor, no assigned doctor on site")
        page.click("#override-go")
        page.wait_for_selector(".override-banner:has-text('EMERGENCY OVERRIDE')")
        shot(page, "5-doctor-override")

        # 6. Admin: the audit trail
        sign_in(page, "gadeleke")
        page.click("#nav-audit")
        page.wait_for_selector("#rows tr")
        shot(page, "6-admin-audit-log")

        browser.close()

        if errors:
            print("\nBrowser-side errors:")
            for error in errors:
                print(f"  {error}")
            raise SystemExit(1)
        print(f"\n{len(SHOTS)} screenshots written to {OUT}/ with no browser errors.")


if __name__ == "__main__":
    main()
