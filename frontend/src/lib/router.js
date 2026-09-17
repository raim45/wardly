import { useEffect, useState } from 'react'

/**
 * A hash router, deliberately small.
 *
 * README2 lists the frontend tools as React + Tailwind, so rather than pull in
 * a routing library for four views, the URL hash carries the route. Hash routes
 * survive a refresh and drive the back button for free, which is all this demo
 * needs. Swapping in react-router later is a contained change: every route is
 * read through `useRoute` and every link through `hrefFor`.
 */

function parse() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [section, ...rest] = raw.split('/')
  return { section: section || 'patients', params: rest }
}

export function useRoute() {
  const [route, setRoute] = useState(parse)

  useEffect(() => {
    const onChange = () => setRoute(parse())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

/** The href for a route, for use in an <a>. */
export function hrefFor(path) {
  return `#/${path.replace(/^\/?#?\/?/, '')}`
}

export function navigate(path) {
  window.location.hash = hrefFor(path)
}
