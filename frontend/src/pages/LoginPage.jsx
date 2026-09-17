import { useState } from 'react'

import { Button, Field, Input, Meta, ShieldPersonMark } from '../components/index.js'
import { login, storeUser } from '../lib/api.js'

/**
 * DESIGN.md page 1 — a split screen, explicitly "not a centered card on a
 * gradient", which it also lists under What NOT to do.
 *
 * Left: primary blue, white text, one line of copy with the shield mark below
 * it. Right: the form on `bg`, labels above inputs rather than placeholders.
 *
 * DESIGN.md notes this doubles as the demo video's opening shot, so it is
 * meant to read as a product in the first second rather than as a form.
 */
export function LoginPage({ onSignIn }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await login(username.trim(), password)
      storeUser(user)
      onSignIn(user)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col bg-primary p-10 text-white lg:p-14">
        <p className="text-meta font-medium text-white/85">Patient Records</p>

        <div className="my-auto py-14">
          <p className="max-w-md font-serif text-page-title">
            Patient records, visible only to the people caring for that patient.
          </p>
          <ShieldPersonMark className="mt-12 h-28 w-auto text-white/90" />
        </div>
      </section>

      <section className="flex items-center justify-center bg-bg p-10">
        <form className="w-full max-w-sm" onSubmit={handleSubmit} noValidate>
          <h1 className="text-page-title font-serif text-ink">Sign in</h1>
          <p className="mt-2 mb-8 text-body text-ink-muted">Use your hospital account.</p>

          {error ? (
            <div
              role="alert"
              className="mb-6 rounded-card border border-border bg-denied/5 px-4 py-3 text-body text-denied"
            >
              {error}
            </div>
          ) : null}

          <Field label="Username" htmlFor="username">
            <Input
              id="username"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Field>

          <Field label="Password" htmlFor="password" className="mb-7">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>

          <p className="mt-8 text-center">
            <Meta>Prototype — demo accounts use the password “demo”.</Meta>
          </p>
        </form>
      </section>
    </div>
  )
}
