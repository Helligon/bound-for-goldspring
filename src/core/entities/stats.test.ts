import { describe, expect, it } from 'vitest'
import {
  applyModifiers,
  maxHealthFor,
  ZERO_STATS,
  HEALTH_BASE,
  HEALTH_PER_STR,
  type Stats,
} from './stats'

const base: Stats = { str: 5, spd: 4, dex: 3 }

describe('stats', () => {
  it('ZERO_STATS is all zero', () => {
    expect(ZERO_STATS).toEqual({ str: 0, spd: 0, dex: 0 })
  })

  it('returns a copy of the base when there are no modifiers', () => {
    const out = applyModifiers(base, [])
    expect(out).toEqual(base)
    expect(out).not.toBe(base)
  })

  it('adds a single partial modifier, leaving absent stats untouched', () => {
    const out = applyModifiers(base, [{ str: 2, dex: 1 }])
    expect(out.str).toBe(7)
    expect(out.dex).toBe(4)
    expect(out.spd).toBe(4) // untouched
  })

  it('sums several modifiers, including negatives', () => {
    const out = applyModifiers(base, [{ str: 2 }, { str: 1, spd: -2 }, { dex: 1 }])
    expect(out.str).toBe(8)
    expect(out.spd).toBe(2)
    expect(out.dex).toBe(4)
  })

  it('does not mutate the base or the modifiers', () => {
    const mods = [{ str: 3 }]
    applyModifiers(base, mods)
    expect(base.str).toBe(5)
    expect(mods[0]).toEqual({ str: 3 })
  })

  describe('maxHealthFor', () => {
    it('derives health from strength off the base', () => {
      expect(maxHealthFor(0)).toBe(HEALTH_BASE)
      expect(maxHealthFor(5)).toBe(HEALTH_BASE + 5 * HEALTH_PER_STR)
    })

    it('rises with strength', () => {
      expect(maxHealthFor(8)).toBeGreaterThan(maxHealthFor(3))
    })
  })
})
