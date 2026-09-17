/**
 * The API client.
 *
 * Login state lives in localStorage and travels as an X-User-Id header, which
 * is trivially forgeable and is fine for a prototype — it is identity, not
 * authentication.
 */

const STORAGE_KEY = 'wardly_user'

export function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Corrupt, or storage blocked: treat as signed out rather than crashing.
    return null
  }
}

export function storeUser(user) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // Storage unavailable — the session simply won't survive a reload.
  }
}

export function clearStoredUser() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* nothing to do */
  }
}

/**
 * Concurrent identical reads are collapsed into one request.
 *
 * React StrictMode runs effects twice in development, which fired two requests
 * per page view. Because reads are audited server-side, that wrote two
 * identical rows into the audit log for a single visit — and a duplicated
 * audit trail is worse than a slow one. The server cannot tell a double-fetch
 * from two genuine visits, so the client is the right place to fix it.
 *
 * Only reads are deduped, and only while a request is actually in flight.
 */
const inFlight = new Map()

export async function apiFetch(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const key = method === 'GET' ? path : null

  if (key && inFlight.has(key)) return inFlight.get(key)

  const promise = send(path, options, method)
  if (key) {
    inFlight.set(key, promise)
    // Both handlers, so a rejected request still clears the entry without
    // leaving an unhandled rejection behind.
    promise.then(
      () => inFlight.delete(key),
      () => inFlight.delete(key),
    )
  }
  return promise
}

async function send(path, options, method) {
  const user = readStoredUser()
  const headers = { ...(options.headers || {}) }
  if (user) headers['X-User-Id'] = String(user.id)
  if (options.body) headers['Content-Type'] = 'application/json'

  const response = await fetch(path, { ...options, method, headers })
  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (body?.detail) detail = body.detail
    } catch {
      // Non-JSON error body: keep the generic message.
    }
    const error = new Error(detail)
    error.status = response.status
    throw error
  }
  return response.status === 204 ? null : response.json()
}

export async function login(username, password) {
  return apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}
