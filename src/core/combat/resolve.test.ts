import { describe, expect, it } from 'vitest'
import { Rng } from '../rng'
import { combatantById } from './data'
import { DEFAULT_FIELD, MAX_TICKS } from './constants'
import { resolveBattle, traceBattle } from './resolve'
import type { BattleSetup } from './types'

const place = (id: string, q: number, r: number) => ({ sheet: combatantById(id)!, pos: { q, r } })

describe('resolveBattle', () => {
  it('is deterministic: same setup and seed replay identically', () => {
    const setup: BattleSetup = {
      field: DEFAULT_FIELD,
      player: [place('ordas-blade-dancer', 0, 2)],
      enemy: [place('neutral-crossbowman', 7, 2)],
    }
    const a = resolveBattle(setup, new Rng('seed-1'))
    const b = resolveBattle(setup, new Rng('seed-1'))
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('reports an outcome for every unit and terminates in bounds', () => {
    const setup: BattleSetup = {
      field: DEFAULT_FIELD,
      player: [place('neutral-bandit', 0, 1), place('neutral-bandit', 0, 3)],
      enemy: [place('neutral-wolf', 7, 2)],
    }
    const res = resolveBattle(setup, new Rng('s'))
    expect(res.units).toHaveLength(3)
    expect(res.ticks).toBeGreaterThan(0)
    expect(res.ticks).toBeLessThanOrEqual(MAX_TICKS)
  })

  it('a strong hero beats a lone mook, who dies outright', () => {
    const setup: BattleSetup = {
      field: DEFAULT_FIELD,
      player: [place('goldspring-gilded-executioner', 0, 2)],
      enemy: [place('neutral-bandit', 7, 2)],
    }
    const res = resolveBattle(setup, new Rng('fight'))
    expect(res.winner).toBe('player')
    const bandit = res.units.find((u) => u.side === 'enemy')!
    expect(bandit.dead).toBe(true)
    expect(bandit.downed).toBe(false)
    expect(bandit.survivedSave).toBeNull() // a mook never rolls a save
  })

  it('a defeated player hero goes down and rolls a death save', () => {
    const setup: BattleSetup = {
      field: DEFAULT_FIELD,
      player: [place('neutral-sellsword', 0, 2)],
      enemy: [
        place('neutral-legendary-beast', 7, 1),
        place('neutral-legendary-beast', 7, 2),
        place('neutral-legendary-beast', 7, 3),
      ],
    }
    const res = resolveBattle(setup, new Rng('doomed'))
    expect(res.winner).toBe('enemy')
    const hero = res.units.find((u) => u.side === 'player')!
    // A player hero never simply dies mid-battle; a save was rolled either way.
    expect(hero.survivedSave).not.toBeNull()
  })

  it('an enemy hero dies outright with no save when the player wins', () => {
    const setup: BattleSetup = {
      field: DEFAULT_FIELD,
      player: [
        place('goldspring-gilded-executioner', 0, 1),
        place('goldspring-gilded-executioner', 0, 3),
      ],
      enemy: [place('neutral-sellsword', 7, 2)],
    }
    const res = resolveBattle(setup, new Rng('storm'))
    expect(res.winner).toBe('player')
    const enemyHero = res.units.find((u) => u.side === 'enemy')!
    expect(enemyHero.dead).toBe(true)
    expect(enemyHero.survivedSave).toBeNull()
  })
})

describe('traceBattle', () => {
  const setup: BattleSetup = {
    field: DEFAULT_FIELD,
    player: [place('goldspring-gilded-executioner', 0, 2)],
    enemy: [place('neutral-bandit', 7, 2)],
  }

  it('records the deployment plus one frame per tick', () => {
    const { result, frames } = traceBattle(setup, new Rng('trace'))
    expect(frames).toHaveLength(result.ticks + 1)
    expect(frames[0].tick).toBe(0)
    expect(frames[0].units.every((u) => u.alive)).toBe(true)
  })

  it('agrees with resolveBattle on the same seed', () => {
    const direct = resolveBattle(setup, new Rng('trace'))
    const traced = traceBattle(setup, new Rng('trace')).result
    expect(JSON.stringify(traced)).toBe(JSON.stringify(direct))
  })
})

describe('combat log (events)', () => {
  it('records attacks and a death when a mook falls', () => {
    const setup: BattleSetup = {
      field: DEFAULT_FIELD,
      player: [place('goldspring-gilded-executioner', 0, 2)],
      enemy: [place('neutral-bandit', 7, 2)],
    }
    const { events } = traceBattle(setup, new Rng('log'))
    const attacks = events.filter((e) => e.kind === 'attack')
    expect(attacks.length).toBeGreaterThan(0)
    for (const a of attacks) {
      if (a.kind === 'attack') expect(a.amount).toBeGreaterThan(0)
    }
    const death = events.find((e) => e.kind === 'death')
    expect(death).toBeDefined()
    if (death && death.kind === 'death') expect(death.unitName).toBe('Bandit')
  })

  it('records a down and a death save when a player hero falls', () => {
    const setup: BattleSetup = {
      field: DEFAULT_FIELD,
      player: [place('neutral-sellsword', 0, 2)],
      enemy: [
        place('neutral-legendary-beast', 7, 1),
        place('neutral-legendary-beast', 7, 2),
        place('neutral-legendary-beast', 7, 3),
      ],
    }
    const { events } = traceBattle(setup, new Rng('doomed'))
    expect(events.some((e) => e.kind === 'down')).toBe(true)
    expect(events.some((e) => e.kind === 'save')).toBe(true)
  })

  it('events are ordered by tick and reproducible from the seed', () => {
    const setup: BattleSetup = {
      field: DEFAULT_FIELD,
      player: [place('masked-boar-rider', 0, 2)],
      enemy: [place('neutral-crossbowman', 7, 2)],
    }
    const a = traceBattle(setup, new Rng('x')).events
    const b = traceBattle(setup, new Rng('x')).events
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    for (let i = 1; i < a.length; i++) expect(a[i].tick).toBeGreaterThanOrEqual(a[i - 1].tick)
  })
})
