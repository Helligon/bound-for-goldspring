import { describe, expect, it } from 'vitest'
import { combatantById } from './data'
import { instantiate } from './unit'
import { stepToward } from './movement'
import { DEFAULT_FIELD } from './constants'
import { canCross, edgeKey, hexDistance, hexKey, neighboursInField, type Field, type Hex } from './hex'
import type { Unit } from './types'

function mk(q: number, r: number): Unit {
  return instantiate(combatantById('neutral-bandit')!, 'player', { q, r }, `u-${q}-${r}`)
}

const field = DEFAULT_FIELD

describe('stepToward', () => {
  it('moves one hex and ends up closer to the target', () => {
    const u = mk(0, 2)
    const target: Hex = { q: 6, r: 2 }
    const next = stepToward(u, target, new Set([hexKey(target)]), field)
    expect(hexDistance(next, u.pos)).toBe(1)
    expect(hexDistance(next, target)).toBeLessThan(hexDistance(u.pos, target))
  })

  it('routes around a blocked edge instead of crossing it', () => {
    const a: Hex = { q: 2, r: 2 }
    const target: Hex = { q: 3, r: 2 } // adjacent, but the border is blocked
    const walled: Field = { ...field, blockedEdges: new Set([edgeKey(a, target)]) }
    const u = mk(2, 2)
    const next = stepToward(u, target, new Set([hexKey(target)]), walled)
    expect(hexKey(next)).not.toBe(hexKey(u.pos)) // it moves
    expect(hexKey(next)).not.toBe(hexKey(target)) // not across the blocked edge
    expect(canCross(walled, u.pos, next)).toBe(true) // via a passable border
  })

  it('holds when fully enclosed by bodies', () => {
    const u = mk(3, 3)
    const occupied = new Set<string>([hexKey({ q: 7, r: 3 })])
    for (const n of neighboursInField(field, u.pos)) occupied.add(hexKey(n))
    expect(hexKey(stepToward(u, { q: 7, r: 3 }, occupied, field))).toBe(hexKey(u.pos))
  })

  it('holds when adjacent to the target (whose hex is occupied)', () => {
    const u = mk(3, 2)
    const target: Hex = { q: 4, r: 2 }
    expect(hexKey(stepToward(u, target, new Set([hexKey(target)]), field))).toBe(hexKey(u.pos))
  })

  it('is deterministic across repeated calls', () => {
    const u = mk(0, 0)
    const target: Hex = { q: 5, r: 3 }
    const occ = new Set([hexKey(target)])
    expect(hexKey(stepToward(u, target, occ, field))).toBe(hexKey(stepToward(u, target, occ, field)))
  })
})
