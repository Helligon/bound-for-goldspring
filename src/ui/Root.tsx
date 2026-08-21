import { useEffect, useState } from 'react'
import { App } from './App'
import { SkirmishView } from './SkirmishView'

// Hash-based routing so the static itch.io build works with no server rewrites:
// '#/skirmish' shows the battle sim, anything else the map. See plan.md Phase 3.
function currentRoute(): string {
  return window.location.hash.replace(/^#/, '') || '/'
}

export function Root() {
  const [route, setRoute] = useState(currentRoute())
  useEffect(() => {
    const onHash = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  return route.startsWith('/skirmish') ? <SkirmishView /> : <App />
}
