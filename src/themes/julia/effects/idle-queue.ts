// The work that can wait a moment: card stills, and warming the cards'
// renderer. None of it runs while the stage is travelling, so a page's worth
// of stills never lands in the middle of the set's flight. Once the set has
// landed the queue drains in short slices, a few milliseconds of tasks at a
// time with the page free to paint in between, so the cards fill in within a
// frame or two of each other rather than one long frozen task.
//
// Not requestIdleCallback: a page that animates every frame (the band's set
// leaning toward the pointer, a live card) is rarely idle, and each card
// would sit out the callback's whole timeout before it drew.

type Task = () => void

/** How long one slice may run before the page gets a frame back. */
const SLICE_MS = 6

const queue: Task[] = []
let holdTill = 0
let timer = 0

/** Leave the queue alone until `at` (a performance.now() time): the stage is busy. */
export function holdUntil(at: number) {
  holdTill = Math.max(holdTill, at)
  if (timer) {
    window.clearTimeout(timer)
    timer = 0
    schedule()
  }
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
  if (timer || !queue.length) return
  timer = window.setTimeout(run, Math.max(0, holdTill - performance.now()))
}

function run() {
  timer = 0
  if (holdTill > performance.now()) {
    schedule()
    return
  }
  const start = performance.now()
  do queue.shift()?.()
  while (queue.length && performance.now() - start < SLICE_MS)
  schedule()
}
