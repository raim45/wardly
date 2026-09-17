"""Checks the built UI against DESIGN.md's rules.

    python -m uvicorn main:app --port 8000      # backend, in one terminal
    npm run dev                                 # in frontend/
    python check_design.py                      # every page
    python check_design.py login kitchen        # named pages only

Stage 4 says to review the design system hardest, because every later page
depends on it. These are the rules from DESIGN.md that a screenshot cannot
eyeball reliably — ALL-CAPS labels, stray shadows, off-token colours, and
whether keyboard focus is actually visible.

Exits non-zero if any rule is broken.
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"

# Every colour DESIGN.md permits, as RGB triples. Ward colours are included
# because DESIGN.md page 2 explicitly asks for 3-4 muted ward colours.
TOKENS = {
    "bg": (0xF7, 0xF8, 0xFA),
    "surface": (0xFF, 0xFF, 0xFF),
    "ink": (0x1C, 0x24, 0x30),
    "ink-muted": (0x5B, 0x65, 0x72),
    "border": (0xE2, 0xE5, 0xEA),
    "primary": (0x2A, 0x5C, 0x8A),
    "primary-hover": (0x20, 0x47, 0x69),
    "ward-teal": (0x3F, 0x7A, 0x72),
    "granted": (0x2E, 0x7D, 0x53),
    "denied": (0xB5, 0x46, 0x2F),
    "override": (0xC2, 0x41, 0x0C),
    "ward-3": (0x3F, 0x7A, 0x72),
    "ward-4": (0x5C, 0x6B, 0x99),
    "ward-7": (0x8A, 0x6A, 0x52),
}

# A signed-in user, matching what the demo signs in as.
SIGNED_IN_USER = (
    "localStorage.setItem('wardly_user', JSON.stringify("
    "{id: 4, name: 'Nurse Chidinma Okafor', username: 'cokafor', "
    "role: 'nurse', ward: 'Ward 3'}));"
)

# The audit log is admin-only, so it needs its own session.
ADMIN_USER = (
    "localStorage.setItem('wardly_user', JSON.stringify("
    "{id: 8, name: 'Grace Adeleke', username: 'gadeleke', "
    "role: 'admin', ward: 'Ward 7'}));"
)

PAGES = {
    "login": {
        "url": f"{BASE}/",
        "setup": "localStorage.clear();",
        "expect_card": False,
    },
    "patients": {
        "url": f"{BASE}/#/patients",
        "setup": SIGNED_IN_USER,
        "expect_card": False,
    },
    "detail": {
        "url": f"{BASE}/#/patients/1",
        "setup": SIGNED_IN_USER,
        "expect_card": True,
    },
    "audit": {
        "url": f"{BASE}/#/audit",
        "setup": ADMIN_USER,
        "expect_card": False,
    },
    "kitchen": {
        "url": f"{BASE}/#/kitchen",
        "setup": SIGNED_IN_USER,
        "expect_card": True,
    },
}


def oklab_to_srgb(lightness, a_axis, b_axis):
    """Tailwind v4 builds opacity tints with color-mix() in oklab space, and
    Chrome reports the result as `oklab(...)`. Convert back so those can be
    compared against the token table rather than waved through."""
    l_ = lightness + 0.3963377774 * a_axis + 0.2158037573 * b_axis
    m_ = lightness - 0.1055613458 * a_axis - 0.0638541728 * b_axis
    s_ = lightness - 0.0894841775 * a_axis - 1.2914855480 * b_axis
    l, m, s = l_**3, m_**3, s_**3
    linear = (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )

    def encode(channel):
        channel = max(0.0, min(1.0, channel))
        if channel <= 0.0031308:
            return 12.92 * channel
        return 1.055 * channel ** (1 / 2.4) - 0.055

    return tuple(round(encode(c) * 255) for c in linear)


def resolve(value):
    """Returns (r, g, b, alpha), or None if the format is unrecognised."""
    if value.startswith("rgb"):
        body = value[value.find("(") + 1 : value.find(")")]
        nums = [p for p in body.replace("/", " ").replace(",", " ").split() if p]
        parts = [float(n.rstrip("%")) for n in nums]
        if len(parts) < 3:
            return None
        return (round(parts[0]), round(parts[1]), round(parts[2]),
                parts[3] if len(parts) > 3 else 1.0)
    if value.startswith("oklab"):
        body = value[value.find("(") + 1 : value.find(")")]
        nums = [p for p in body.replace("/", " ").split() if p]
        parts = [float(n) for n in nums]
        rgb = oklab_to_srgb(*parts[:3])
        return (*rgb, parts[3] if len(parts) > 3 else 1.0)
    return None


def is_token_colour(rgb):
    # Tolerate rounding: a tint that round-trips through oklab can land a unit
    # away from the token on any given channel.
    return any(all(abs(c - t) <= 2 for c, t in zip(rgb, token)) for token in TOKENS.values())


def check(page, label, failures, condition, detail=""):
    print(f"  {'PASS' if condition else 'FAIL'}  {label}")
    if not condition:
        if detail:
            print(f"        {detail}")
        failures.append(label)


def check_page(browser, name, config, failures):
    print(f"\n{name}  ({config['url']})")
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(config["url"], wait_until="domcontentloaded")
    if config.get("setup"):
        page.evaluate(config["setup"])
        # reload(), not goto() — navigating to the URL already loaded is a
        # no-op, so the app would never re-read the session we just stored.
        page.reload(wait_until="networkidle")
    else:
        page.goto(config["url"], wait_until="networkidle")
    page.wait_for_timeout(900)

    # --- no ALL-CAPS labels (DESIGN.md forbids them outright) ---
    transformed = page.evaluate("""() =>
      [...document.querySelectorAll('*')]
        .filter(el => getComputedStyle(el).textTransform === 'uppercase')
        .map(el => el.tagName + '.' + el.className)
    """)
    check(page, "no element is styled uppercase", failures, not transformed, str(transformed[:3]))

    # --- flat: no shadows anywhere ---
    shadows = page.evaluate("""() =>
      [...document.querySelectorAll('*')]
        .filter(el => getComputedStyle(el).boxShadow !== 'none')
        .map(el => el.tagName + '.' + el.className)
    """)
    check(page, "nothing has a box-shadow", failures, not shadows, str(shadows[:3]))

    # --- every colour comes from the token table ---
    stray = page.evaluate("""() => {
      // Skip elements that never paint: metadata tags carry the initial
      // `rgb(0, 0, 0)` and would otherwise look like off-token colours.
      const SKIP = new Set(['HTML','HEAD','META','LINK','SCRIPT','STYLE','TITLE','BASE']);
      const out = [];
      for (const el of document.querySelectorAll('*')) {
        if (SKIP.has(el.tagName)) continue;
        if (el.getClientRects().length === 0) continue;
        const cs = getComputedStyle(el);
        for (const prop of ['color', 'backgroundColor', 'borderTopColor']) {
          const v = cs[prop];
          if (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent') {
            out.push([prop, v, el.tagName + '.' + el.className]);
          }
        }
      }
      return out;
    }""")

    off_token, unparsed = set(), set()
    for _prop, value, where in stray:
        resolved = resolve(value)
        if resolved is None:
            unparsed.add(f"{value} ({where})")
        elif not is_token_colour(resolved[:3]):
            off_token.add(f"{value} ({where})")

    check(page, "every colour traces back to a token", failures, not off_token,
          "\n        ".join(sorted(off_token)[:6]))
    check(page, "no colour in an unrecognised format", failures, not unparsed,
          "\n        ".join(sorted(unparsed)[:4]))

    # --- radius: 6px on controls, 8px on cards ---
    radii = page.evaluate("""() => {
      const grab = (sel) => {
        const el = document.querySelector(sel);
        return el && el.getClientRects().length ? getComputedStyle(el).borderTopLeftRadius : null;
      };
      return { button: grab('button'), card: grab('.rounded-card') };
    }""")
    check(page, "button radius is 6px", failures, radii["button"] == "6px", str(radii["button"]))
    if config["expect_card"]:
        check(page, "card radius is 8px", failures, radii["card"] == "8px", str(radii["card"]))

    # --- keyboard focus is actually visible ---
    page.keyboard.press("Tab")
    outline = page.evaluate("""() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return { tag: el.tagName, width: cs.outlineWidth, style: cs.outlineStyle };
    }""")
    check(page, "keyboard focus shows a 2px outline", failures,
          bool(outline) and outline["style"] != "none" and outline["width"] == "2px",
          str(outline))

    # --- the typefaces are actually loading, not falling back ---
    fonts = page.evaluate("""() => {
      const h = document.querySelector('h1');
      return {
        heading: h ? getComputedStyle(h).fontFamily : null,
        body: getComputedStyle(document.body).fontFamily,
        status: document.fonts.status,
      };
    }""")
    if fonts["heading"]:
        check(page, "headings use IBM Plex Serif", failures,
              "IBM Plex Serif" in fonts["heading"], str(fonts["heading"]))
    check(page, "body uses IBM Plex Sans", failures,
          "IBM Plex Sans" in fonts["body"], str(fonts["body"]))
    check(page, "webfonts finished loading", failures, fonts["status"] == "loaded", str(fonts["status"]))

    # --- DESIGN.md reserves the override colour; it must stay rare ---
    override_fills = page.evaluate("""() => {
      const target = 'rgb(194, 65, 12)';
      let n = 0;
      for (const el of document.querySelectorAll('*')) {
        if (getComputedStyle(el).backgroundColor === target) n++;
      }
      return n;
    }""")
    check(page, "the override fill stays rare", failures, override_fills <= 3,
          f"{override_fills} solid override fills")

    page.close()


def main():
    wanted = sys.argv[1:] or list(PAGES)
    unknown = [w for w in wanted if w not in PAGES]
    if unknown:
        sys.exit(f"unknown page(s): {', '.join(unknown)}. Known: {', '.join(PAGES)}")

    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        for name in wanted:
            check_page(browser, name, PAGES[name], failures)
        browser.close()

    print()
    if failures:
        print(f"{len(failures)} rule(s) broken:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)
    print("All DESIGN.md rules hold.")


if __name__ == "__main__":
    main()
