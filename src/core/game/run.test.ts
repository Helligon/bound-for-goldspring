import { describe, expect, it } from 'vitest'
import type { MapDefinition } from '../map/types'
import { createGame } from './travel'
import { createResources } from './resources'
import { travelStep } from './run'

// Two nodes joined by a road, plus a gated water edge.
function tinyMap(): MapDefinition {
  const node = (id: string, kind: 'capital' | 'node' = 'node') => ({
    id,
    label: id,
    kind,
    x: 0,
    y: 0,
  })
  return {
    nodes: [node('A', 'capital'), node('B'), node('W')],
    edges: [
      { from: 'A', to: 'B', terrain: 'road' },
      { from: 'A', to: 'W', terrain: 'water' },
    ],
  }
}

describe('run: a travel step moves and pays its cost together', () => {
  it('moves the Captain and spends the step food cost', () => {
    const map = tinyMap()
    const out = travelStep(map, createGame(map, 'A'), createResources({ food: 5 }), 'B')
    expect(out.game.position).toBe('B')
    expect(out.resources.food).toBe(4) // party of one, one food per step
  })

  it('scales the food cost by party size', () => {
    const map = tinyMap()
    const out = travelStep(map, createGame(map, 'A'), createResources({ food: 5 }), 'B', {}, 3)
    expect(out.resources.food).toBe(2)
  })

  it('refuses an illegal move (gated water without the capability) and spends nothing', () => {
    const map = tinyMap()
    const game = createGame(map, 'A')
    const res = createResources({ food: 5 })
    expect(() => travelStep(map, game, res, 'W')).toThrow()
    expect(res.food).toBe(5) // untouched
    // With the capability the crossing succeeds and still costs food.
    const out = travelStep(map, game, res, 'W', { canCrossWater: true })
    expect(out.game.position).toBe('W')
    expect(out.resources.food).toBe(4)
  })

  it('is pure: inputs are left untouched', () => {
    const map = tinyMap()
    const game = createGame(map, 'A')
    const res = createResources({ food: 5 })
    travelStep(map, game, res, 'B')
    expect(game.position).toBe('A')
    expect(res.food).toBe(5)
  })
})
