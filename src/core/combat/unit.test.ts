import { describe, expect, it } from 'vitest'
import { maxHealthFor } from '../entities/stats'
import { combatantById } from './data'
import { RANGED_RANGE, MELEE_RANGE } from './constants'
import { attackProfileFor, instantiate } from './unit'
import type { CombatantSheet } from '../entities/types'

const sheet = (id: string): CombatantSheet => {
  const c = combatantById(id)
  if (!c) throw new Error(`no such combatant ${id}`)
  return c
}

const at = { q: 0, r: 0 }

describe('instantiate', () => {
  it('builds a melee human: adjacent reach, SPD-clocked, weapon str folded in', () => {
    const u = instantiate(sheet('neutral-bandit'), 'player', at, 'u1')
    expect(u.attack.range).toBe(MELEE_RANGE)
    expect(u.attack.governed).toBe('spd')
    expect(u.attack.rof).toBe(2) // short sword
    expect(u.attack.strMod).toBe(2)
    expect(u.moveSpeed).toBe(3) // own SPD, unmounted
  })

  it('halves a mook maxHealth and leaves a hero full', () => {
    const bandit = instantiate(sheet('neutral-bandit'), 'player', at, 'u1') // str 3, mook
    expect(bandit.maxHealth).toBe(Math.floor(maxHealthFor(3) / 2))
    expect(bandit.health).toBe(bandit.maxHealth)

    const sellsword = instantiate(sheet('neutral-sellsword'), 'player', at, 'u2') // str 5, hero
    expect(sellsword.maxHealth).toBe(maxHealthFor(5))
  })

  it('builds a ranged human: extended reach, DEX-clocked, pierces', () => {
    const u = instantiate(sheet('neutral-crossbowman'), 'enemy', at, 'e1')
    expect(u.attack.range).toBe(RANGED_RANGE)
    expect(u.attack.governed).toBe('dex')
    expect(u.attack.pierce).toBe(true)
  })

  it('builds an animal from its natural weapon', () => {
    const wolf = instantiate(sheet('neutral-wolf'), 'enemy', at, 'e1')
    expect(wolf.attack.range).toBe(MELEE_RANGE)
    expect(wolf.attack.governed).toBe('spd')
    expect(wolf.attack.rof).toBe(2)
    expect(wolf.attack.strMod).toBe(0)
  })

  it('a mounted rider takes the mount health bonus, charge, and move speed', () => {
    const rider = instantiate(sheet('masked-boar-rider'), 'player', at, 'u1') // str 6 hero, dire-boar, blood-iron
    // health: base str-health + mount bonus (10), hero so not halved
    expect(rider.maxHealth).toBe(maxHealthFor(6) + 10)
    // charge: mount (4) + braced blood-iron (1)
    expect(rider.charge).toBe(5)
    expect(rider.chargeSpent).toBe(false)
    // moves at the mount's speed, not the rider's SPD
    expect(rider.moveSpeed).toBe(4)
  })

  it('a braced polearm grants charge on foot with no mount', () => {
    const warden = instantiate(sheet('rain-spear-warden'), 'player', at, 'u1') // obsidian-spear charge 2, no mount
    expect(warden.charge).toBe(2)
    expect(warden.moveSpeed).toBe(3) // own SPD
  })

  it('a unit with no charge starts with charge already spent', () => {
    const bandit = instantiate(sheet('neutral-bandit'), 'player', at, 'u1')
    expect(bandit.charge).toBe(0)
    expect(bandit.chargeSpent).toBe(true)
  })
})

describe('attackProfileFor', () => {
  it('treats a thrown alchemical weapon as ranged', () => {
    // Powder Clerk carries the powdershot wand (thrown, also-ranged).
    const p = attackProfileFor(sheet('bookers-powder-clerk'))
    expect(p.governed).toBe('dex')
    expect(p.range).toBe(RANGED_RANGE)
  })
})
