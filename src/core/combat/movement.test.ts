import { describe, expect, it } from 'vitest'
import { combatantById } from './data'
import { instantiate } from './unit'
import { stepToward } from './movement'
import { DEFAULT_FIELD } from './constants'
import { hexDistance, hexKey, type Hex } from './hex'
import type { Unit } from './types'

function mk(q: number, r: number): Unit {
  return instantiate(combatantById('neutral-bandit')!, 'player', { q, r }, `u-${q}-${r}`)
}

const field = DEFAULT_FIELD

describe('stepToward', () => {
  it('moves one hex and ends up closer to the target', () => {
    const u = mk(0, 2)
    const target: Hex = { q: 6, r: 2 }
    const next = stepToward(u, target, new Set(), field)
    expect(hexDistance(next, u.pos)).toBe(1)
    expect(hexDistance(next, target)).toBeLessThan(hexDistance(u.pos, target))
  })

  it('holds position when every closer hex is occupied (body-blocking)', () => {
    const u = mk(0, 2)
    const target: Hex = { q: 6, r: 2 }
    // Occupy all in-field neighbours that would be strictly closer.
    const occupied = new Set<string>()
    for (const d of [
      { q: 1, r: 2 },
      { q: 1, r: 1 },
    ]) {
      occupied.add(hexKey(d))
    }
    const next = stepToward(u, target, occupied, field)
    expect(hexKey(next)).toBe(hexKey(u.pos))
  })

  it('holds when already adjacent to the target (whose hex is occupied)', () => {
    const u = mk(3, 2)
    const target: Hex = { q: 4, r: 2 }
    // The target stands on its hex, so the unit cannot step onto it.
    const occupied = new Set<string>([hexKey(target)])
    expect(hexKey(stepToward(u, target, occupied, field))).toBe(hexKey(u.pos))
  })

  it('is deterministic across repeated calls', () => {
    const u = mk(0, 0)
    const target: Hex = { q: 5, r: 3 }
    const a = stepToward(u, target, new Set(), field)
    const b = stepToward(u, target, new Set(), field)
    expect(hexKey(a)).toBe(hexKey(b))
  })
})
