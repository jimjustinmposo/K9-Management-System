export function createLatestLoad() {
  let generation = 0
  let current: (() => Promise<void>) | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  function cancelTimer() { clearTimeout(timer); timer = undefined }
  function run() { cancelTimer(); return current?.() ?? Promise.resolve() }
  return {
    configure<T>(read: () => Promise<T>, start: () => void, success: (value: T) => void, failure: (error: unknown) => void, finish: () => void) {
      generation += 1
      current = async () => {
        const id = ++generation
        start()
        try {
          const value = await read()
          if (id === generation) success(value)
        } catch (error) {
          if (id === generation) failure(error)
        } finally {
          if (id === generation) finish()
        }
      }
    },
    run,
    schedule(delay: number, before: () => void) {
      cancelTimer()
      if (delay === 0) { before(); void run(); return }
      timer = setTimeout(() => { before(); void run() }, delay)
    },
    stop() { cancelTimer(); generation += 1; current = null },
  }
}