import type { Complex } from './travel'

// A line from the pages to the stage. Root owns one; the projects index talks
// into it when a card is pointed at, and the Backdrop listens while the
// projects page is showing.

export interface StageBus {
  /** Send the band's set to a constant, or (null) back to the page's own. */
  preview: (c: Complex | null) => void
  listen: (fn: ((c: Complex | null) => void) | null) => void
}

export function createStageBus(): StageBus {
  let listener: ((c: Complex | null) => void) | null = null
  return {
    preview: (c) => listener?.(c),
    listen: (fn) => {
      listener = fn
    },
  }
}
