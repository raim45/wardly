import { useState } from 'react'

import { AppShell, Notice, PageBody, PageHeader } from './components/index.js'
import { clearStoredUser, readStoredUser } from './lib/api.js'
import { hrefFor, useRoute } from './lib/router.js'
import { AuditLogPage } from './pages/AuditLogPage.jsx'
import { KitchenSink } from './pages/KitchenSink.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { PatientDetailPage } from './pages/PatientDetailPage.jsx'
import { PatientListPage } from './pages/PatientListPage.jsx'

/**
 * Routing and session.
 *
 * The session lives here rather than in the shell because signed-out and
 * signed-in are genuinely different trees: the login screen has no sidebar.
 */

/** Nothing routes here yet. */
function NotFound() {
  return (
    <>
      <PageHeader title="Not found" />
      <PageBody>
        <Notice>
          <p className="text-body">
            There is nothing at this address.{' '}
            <a href={hrefFor('patients')} className="text-primary underline">
              Go to your patient list
            </a>
            .
          </p>
        </Notice>
      </PageBody>
    </>
  )
}

function Section({ route, user }) {
  const [first, second] = route.params

  if (route.section === 'kitchen') return <KitchenSink />
  if (route.section === 'audit') return <AuditLogPage user={user} />
  if (route.section === 'patients') {
    // #/patients/3 is the detail page; #/patients on its own is the list.
    if (first) return <PatientDetailPage patientId={first} />
    return <PatientListPage user={user} />
  }
  return <NotFound />
}

export default function App() {
  const [user, setUser] = useState(readStoredUser)
  const route = useRoute()

  if (!user) {
    return <LoginPage onSignIn={setUser} />
  }

  function signOut() {
    clearStoredUser()
    setUser(null)
    window.location.hash = ''
  }

  return (
    <AppShell user={user} active={route.section} onSignOut={signOut}>
      <Section route={route} user={user} />
    </AppShell>
  )
}
