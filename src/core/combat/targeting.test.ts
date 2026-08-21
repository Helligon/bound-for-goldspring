import { describe, expect, it } from 'vitest'
import { combatantById } from './data'
import { instantiate } from './unit'
import { chooseTarget } from './targeting'
import type { Side, Unit } from './types'

let n = 0
function mk(id: string, side: Side, q: number, r: number, over: Partial<Unit> = {}): Unit {
  const sheet = combatantById(id)!
  const u = instantiate(sheet, side, { q, r }, `${side}-${n++}`)
  return Object.assign(u, over)
}

describe('chooseTarget', () => {
  it('returns null when no enemies remain', () => {
    const me = mk('neutral-bandit', 'player', 0, 0)
    const ally = mk('neutral-bandit', 'player', 1, 0)
    expect(chooseTarget(me, [me, ally])).toBeNull()
  })

  it('picks the nearest enemy', () => {
    const me = mk('neutral-bandit', 'player', 0, 0)
    const near = mk('neutral-bandit', 'enemy', 2, 0)
    const far = mk('neutral-bandit', 'enemy', 5, 0)
    expect(chooseTarget(me, [me, near, far])?.id).toBe(near.id)
  })

  it('breaks a distance tie by lower health, then id', () => {
    const me = mk('neutral-bandit', 'player', 0, 0)
    const healthy = mk('neutral-bandit', 'enemy', 2, 0, { health: 10 })
    const hurt = mk('neutral-bandit', 'enemy', 0, 2, { health: 3 })
    expect(chooseTarget(me, [me, healthy, hurt])?.id).toBe(hurt.id)
  })

  it('ignores dead and downed enemies', () => {
    const me = mk('neutral-bandit', 'player', 0, 0)
    const dead = mk('neutral-bandit', 'enemy', 1, 0, { dead: true })
    const alive = mk('neutral-bandit', 'enemy', 4, 0)
    expect(chooseTarget(me, [me, dead, alive])?.id).toBe(alive.id)
  })

  it('is captured by an adjacent taunter over a nearer non-taunter', () => {
    const me = mk('neutral-bandit', 'player', 0, 0)
    const nonTaunter = mk('neutral-bandit', 'enemy', 1, 0) // adjacent, no taunt
    const taunter = mk('neutral-legendary-beast', 'enemy', 1, -1) // adjacent, taunt
    expect(chooseTarget(me, [me, nonTaunter, taunter])?.id).toBe(taunter.id)
  })

  it('ignores a taunter that is not adjacent', () => {
    const me = mk('neutral-bandit', 'player', 0, 0)
    const near = mk('neutral-bandit', 'enemy', 1, 0)
    const farTaunter = mk('neutral-legendary-beast', 'enemy', 4, 0)
    expect(chooseTarget(me, [me, near, farTaunter])?.id).toBe(near.id)
  })
})
