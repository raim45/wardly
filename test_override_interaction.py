import subprocess
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"

def main():
    subprocess.run(["python", "seed.py"], check=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=False)
        page = browser.new_page()

        # Login as Nurse Chidinma Okafor (cokafor)
        page.goto(f"{BASE}/")
        page.fill("#username", "cokafor")
        page.fill("#password", "demo")
        page.click("button[type='submit']")
        page.wait_for_selector("h1:has-text('Patients')")

        # Open unassigned patient Bolanle Adesanya
        page.click("tr:has-text('Bolanle Adesanya')")
        page.wait_for_selector("text=You don't have access to this patient")
        print("Denied state verified.")

        # Click Emergency Override header button
        page.click("header button:has-text('Emergency override')")
        page.wait_for_selector("#override-reason")

        # Type reason
        page.fill("#override-reason", "Emergency triage in progress for acute patient")
        print("Filled reason.")

        # Click the submit button inside the form specifically
        page.click("form button[type='submit']")
        page.wait_for_selector("[role='region']:has-text('ACCESSED VIA EMERGENCY OVERRIDE'), div:has-text('ACCESSED VIA EMERGENCY OVERRIDE')")
        print("Emergency banner verified!")

        # Verify unlocked records
        page.wait_for_selector("h2:has-text('Clinical Notes')")
        print("Unlocked data verified successfully!")

        page.screenshot(path="override_verified.png")
        browser.close()

if __name__ == "__main__":
    main()
