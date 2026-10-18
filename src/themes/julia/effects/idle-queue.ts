// The work that can wait: card stills, and warming the cards' renderer. Each
// task runs on its own, in an idle moment with room left in it, and none run
// while the stage is travelling, so a page's worth of stills never lands as
// one long frozen task in the middle of the set's flight.

type Task = () => void

const queue: Task[] = []
let holdTill = 0
let scheduled = false
let holdTimer = 0

// Safari has no requestIdleCallback; a short timeout per task is close enough.
const idleSupported = typeof window.requestIdleCallback === 'function'

/** Leave the queue alone until `at` (a performance.now() time): the stage is busy. */
export function holdUntil(at: number) {
  holdTill = Math.max(holdTill, at)
}

/** Queue a task; the returned function takes it back out if it has not run. */
export function enqueue(task: Task): () => void {
  queue.push(task)
  schedule()
  return () => {
    const i = queue.indexOf(task)
    if (i >= 0) queue.splice(i, 1)
  }
}

function schedule() {
  if (scheduled || !queue.length) return
  scheduled = true
  const wait = holdTill - performance.now()
  if (wait > 0) {
    window.clearTimeout(holdTimer)
    holdTimer = window.setTimeout(() => {
      scheduled = false
      schedule()
    }, wait)
    return
  }
  if (idleSupported) window.requestIdleCallback(run, { timeout: 1500 })
  else window.setTimeout(() => run(null), 50)
}

function run(deadline: IdleDeadline | null) {
  scheduled = false
  if (holdTill > performance.now()) {
    schedule()
    return
  }
  // one task per idle moment, and only if the moment has room for it
  if (!deadline || deadline.didTimeout || deadline.timeRemaining() > 8) queue.shift()?.()
  schedule()
}
