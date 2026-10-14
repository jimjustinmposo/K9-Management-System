// Provider-local coordination: explicit refreshes supersede background requests.
export function createSessionController<T>(
  read: () => Promise<T | null>,
  end: () => Promise<void>,
  publish: (session: T | null) => void,
  ready: () => void,
) {
  let active = true
  let generation = 0
  let pending: Promise<void> | null = null
  let ending: Promise<void> | null = null

  function invalidate() {
    generation += 1
    pending = null
  }

  function refresh(fresh = true): Promise<void> {
    if (!active) return Promise.resolve()
    if (ending) return ending.catch(() => {})
    if (!fresh && pending) return pending
    const current = ++generation
    const request = Promise.resolve().then(read).then(
      (session) => { if (active && current === generation) publish(session) },
      () => { if (active && current === generation) publish(null) },
    ).finally(() => {
      if (active && current === generation) ready()
      if (pending === request) pending = null
    })
    pending = request
    return request
  }

  function logout(): Promise<void> {
    if (ending) return ending
    invalidate()
    const request = Promise.resolve().then(end).then(() => {
      if (active) { publish(null); ready() }
    }).finally(() => {
      invalidate()
      ending = null
    })
    ending = request
    return request
  }

  return {
    refresh,
    logout,
    start() { active = true; return refresh(false) },
    stop() { active = false; invalidate() },
  }
}