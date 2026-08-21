import { describe, expect, it } from 'vitest'
import { Rng } from '../rng'
import { combatantById } from './data'
import { instantiate } from './unit'
import { computeDamage, critChance } from './damage'
import { CRIT_CHANCE_CAP, CRIT_MULTIPLIER } from './constants'
import type { Side, Unit } from './types'

function mk(side: Side, over: Partial<Unit> = {}): Unit {
  const u = instantiate(combatantById('neutral-bandit')!, side, { q: 0, r: 0 }, `${side}`)
  return Object.assign(u, over)
}

// A dex-0 attacker never crits, so damage is deterministic for the maths tests.
function attacker(str: number, over: Partial<Unit['attack']> = {}): Unit {
  const u = mk('player')
  u.stats = { str, spd: 0, dex: 0 }
  u.attack = { ...u.attack, strMod: 0, pierce: false, ...over }
  return u
}

function target(armour: number): Unit {
  const u = mk('enemy')
  u.armourValue = armour
  return u
}

const rng = new Rng('dmg')

describe('computeDamage', () => {
  it('is strength-damage minus armour', () => {
    expect(computeDamage(attacker(5), target(2), rng).amount).toBe(3)
  })

  it('never drops below one', () => {
    expect(computeDamage(attacker(1), target(5), rng).amount).toBe(1)
  })

  it('pierce ignores armour', () => {
    expect(computeDamage(attacker(5, { pierce: true }), target(4), rng).amount).toBe(5)
  })

  it('a flank strike ignores half the armour', () => {
    // str 5 vs armour 4: normally 1, flanked armour 2 -> 3.
    expect(computeDamage(attacker(5), target(4), rng, { flank: true }).amount).toBe(3)
  })

  it('adds the charge bonus before any crit', () => {
    expect(computeDamage(attacker(5), target(2), rng, { chargeBonus: 4 }).amount).toBe(7)
  })

  it('a dex-0 attacker never crits', () => {
    for (let i = 0; i < 50; i++) {
      expect(computeDamage(attacker(5), target(0), rng).crit).toBe(false)
    }
  })
})

describe('critChance', () => {
  it('scales with dex and clamps to the cap', () => {
    expect(critChance(0)).toBe(0)
    expect(critChance(5)).toBeCloseTo(0.15)
    expect(critChance(100)).toBe(CRIT_CHANCE_CAP)
  })

  it('a high-dex attacker crits for the multiplier when the roll lands', () => {
    // Find a seed/roll that crits, then confirm the amount is multiplied.
    const a = attacker(5)
    a.stats = { str: 5, spd: 0, dex: 100 } // effectively always crits at cap 0.6... force certainty:
    a.stats.dex = 1000 // critChance clamps to cap, still < 1, so drive with a crit-guaranteed rng
    const always = { chance: () => true, float: () => 0, int: () => 0, pick: (x: readonly unknown[]) => x[0], seed: 'x' } as unknown as Rng
    const res = computeDamage(a, target(2), always)
    expect(res.crit).toBe(true)
    expect(res.amount).toBe(3 * CRIT_MULTIPLIER)
  })
})
