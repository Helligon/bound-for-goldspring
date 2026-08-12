import { describe, expect, it } from 'vitest'
import { applyModifiers, ZERO_STATS, type Stats } from './stats'

const base: Stats = {
  strength: 5,
  armour: 4,
  attackSpeed: 5,
  charge: 3,
  sight: 4,
  maxHealth: 30,
}

describe('stats', () => {
  it('ZERO_STATS is all zero', () => {
    expect(ZERO_STATS).toEqual({
      strength: 0,
      armour: 0,
      attackSpeed: 0,
      charge: 0,
      sight: 0,
      maxHealth: 0,
    })
  })

  it('returns a copy of the base when there are no modifiers', () => {
    const out = applyModifiers(base, [])
    expect(out).toEqual(base)
    expect(out).not.toBe(base)
  })

  it('adds a single partial modifier, leaving absent stats untouched', () => {
    const out = applyModifiers(base, [{ strength: 2, attackSpeed: 1 }])
    expect(out.strength).toBe(7)
    expect(out.attackSpeed).toBe(6)
    expect(out.armour).toBe(4) // untouched
    expect(out.maxHealth).toBe(30)
  })

  it('sums several modifiers, including negatives', () => {
    const out = applyModifiers(base, [{ strength: 2 }, { strength: 1, armour: -2 }, { charge: 1 }])
    expect(out.strength).toBe(8)
    expect(out.armour).toBe(2)
    expect(out.charge).toBe(4)
  })

  it('does not mutate the base or the modifiers', () => {
    const mods = [{ strength: 3 }]
    applyModifiers(base, mods)
    expect(base.strength).toBe(5)
    expect(mods[0]).toEqual({ strength: 3 })
  })
})
