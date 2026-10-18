import { describe, expect, it } from 'vitest'
import {
  pickRandom,
  reelOffset,
  reelSpinTarget,
  ROULETTE_MS,
  rouletteSteps,
  type ThemeMenuEntry,
} from './theme-menu'

const entry = (id: string, runnable = true): ThemeMenuEntry => ({
  id,
  name: id,
  description: '',
  preview: '',
  runnable,
})

describe('pickRandom', () => {
  const entries = [entry('a'), entry('b'), entry('c', false), entry('d')]

  it('never returns the current theme', () => {
    for (let i = 0; i < 100; i++) {
      expect(pickRandom(entries, 'a', () => i / 100)?.id).not.toBe('a')
    }
  })

  it('never returns a theme the device cannot run', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 100; i++) seen.add(pickRandom(entries, 'a', () => i / 100)!.id)
    expect([...seen].sort()).toEqual(['b', 'd'])
  })

  it('copes with rng returning 1 and with an empty pool', () => {
    expect(pickRandom(entries, 'a', () => 1)?.id).toBe('d')
    expect(pickRandom([entry('a'), entry('b', false)], 'a')).toBeNull()
  })
})

describe('rouletteSteps', () => {
  it('ends on the winner after at least one full lap', () => {
    for (let from = 0; from < 5; from++) {
      for (let to = 0; to < 5; to++) {
        const steps = rouletteSteps(5, from, to)
        expect(steps.at(-1)!.index).toBe(to)
        expect(steps.length).toBeGreaterThanOrEqual(5)
      }
    }
  })

  it('moves one entry at a time', () => {
    const steps = rouletteSteps(5, 3, 1)
    steps.forEach((s, k) => expect(s.index).toBe((3 + k + 1) % 5))
  })

  it('slows down and spends the whole budget', () => {
    const steps = rouletteSteps(5, 0, 2)
    for (let k = 1; k < steps.length; k++) {
      expect(steps[k].ms).toBeGreaterThanOrEqual(steps[k - 1].ms)
    }
    expect(steps.reduce((a, s) => a + s.ms, 0)).toBeCloseTo(ROULETTE_MS)
  })
})

describe('reel geometry', () => {
  it('lands a spin on the same picture as the winner, laps further on', () => {
    for (let to = 0; to < 5; to++) {
      const slot = reelSpinTarget(to, 5)
      expect(slot % 5).toBe(to)
      expect(slot).toBeGreaterThanOrEqual(15)
    }
  })

  it('centres the requested slot in the window', () => {
    // pitch 110 = 100 px cell + 10 px gap, window 300 px
    const y = reelOffset(2, 110, 100, 300)
    const cellTop = 2 * 110 + y
    expect(cellTop + 50).toBe(150)
  })
})
