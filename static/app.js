/* Shared helpers. Login state lives in localStorage and travels as X-User-Id. */

const STORAGE_KEY = "wardly_user";

function getUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null; // corrupt or blocked storage: treat as logged out
  }
}

function setUser(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function logout() {
  localStorage.removeItem(STORAGE_KEY);
  location.href = "/";
}

/** Redirect to login when there is no user. Returns the user otherwise. */
function requireLogin() {
  const user = getUser();
  if (!user) {
    location.replace("/");
    return null;
  }
  return user;
}

/** fetch() that attaches the login header and turns error bodies into throws. */
async function apiFetch(path, options = {}) {
  const user = getUser();
  const headers = Object.assign({}, options.headers || {});
  if (user) headers["X-User-Id"] = String(user.id);
  if (options.body) headers["Content-Type"] = "application/json";

  const response = await fetch(path, Object.assign({}, options, { headers }));
  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body && body.detail) detail = body.detail;
    } catch (e) {
      /* non-JSON error body: keep the generic message */
    }
    const error = new Error(detail);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

const RECORD_TYPE_LABELS = {
  note: "Clinical note",
  result: "Test result",
  prescription: "Prescription",
  admin_info: "Administrative",
};

function formatTimestamp(iso) {
  const date = new Date(iso);
  if (isNaN(date)) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

/** Fill the nav bar on every inner page. */
function renderNav(activePage) {
  const user = requireLogin();
  if (!user) return null;

  const nameEl = document.getElementById("nav-user");
  if (nameEl) {
    nameEl.textContent = `${user.name} · ${user.role}`;
    nameEl.dataset.role = user.role;
  }
  const wardEl = document.getElementById("nav-ward");
  if (wardEl) wardEl.textContent = user.ward ? `Ward: ${user.ward}` : "No ward";

  // The audit log is admin-only; hide the link for everyone else.
  const auditLink = document.getElementById("nav-audit");
  if (auditLink && user.role !== "admin") auditLink.hidden = true;

  document.querySelectorAll("[data-nav]").forEach((el) => {
    if (el.dataset.nav === activePage) el.setAttribute("aria-current", "page");
  });

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  return user;
}
