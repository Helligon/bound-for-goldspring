import { describe, expect, it } from 'vitest'
import type { MapDefinition } from '../map/types'
import { canTravel, createGame, edgeKey, neighbours, revealedNodes, travel } from './travel'

// A tiny, explicit graph so adjacency and sight assertions are unambiguous:
//
//   A(capital) --road-- B --road-- C --road-- D
//        \--water-- E
//
// Positions are irrelevant to travel/fog (graph-only), so they are all 0.
function lineMap(): MapDefinition {
  const node = (id: string, kind: 'capital' | 'node' = 'node') => ({
    id,
    label: id,
    kind,
    x: 0,
    y: 0,
  })
  return {
    nodes: [node('A', 'capital'), node('B'), node('C'), node('D'), node('E')],
    edges: [
      { from: 'A', to: 'B', terrain: 'road' },
      { from: 'B', to: 'C', terrain: 'road' },
      { from: 'C', to: 'D', terrain: 'road' },
      { from: 'A', to: 'E', terrain: 'water' },
    ],
  }
}

describe('travel + fog of war', () => {
  it('starts the Captain at the given capital, which counts as visited', () => {
    const state = createGame(lineMap(), 'A')
    expect(state.position).toBe('A')
    expect(state.visited.has('A')).toBe(true)
    expect(state.sight).toBe(1)
  })

  it('reports the graph neighbours of a node', () => {
    const map = lineMap()
    expect(new Set(neighbours(map, 'A'))).toEqual(new Set(['B', 'E']))
    expect(new Set(neighbours(map, 'B'))).toEqual(new Set(['A', 'C']))
    expect(neighbours(map, 'D')).toEqual(['C'])
  })

  it('reveals the current node and its neighbours at sight 1, hiding the rest', () => {
    const map = lineMap()
    const revealed = revealedNodes(map, createGame(map, 'A'))
    expect(revealed).toEqual(new Set(['A', 'B', 'E']))
    expect(revealed.has('C')).toBe(false)
    expect(revealed.has('D')).toBe(false)
  })

  it('reveals further out as sight increases', () => {
    const map = lineMap()
    const state = { ...createGame(map, 'A'), sight: 2 }
    const revealed = revealedNodes(map, state)
    expect(revealed.has('C')).toBe(true) // two hops away
    expect(revealed.has('D')).toBe(false) // still three hops away
  })

  it('keeps visited nodes revealed even once they fall outside sight', () => {
    const map = lineMap()
    let state = createGame(map, 'A')
    state = travel(map, state, 'B')
    state = travel(map, state, 'C')
    // From C at sight 1 we can see C, B, D. A is three hops away now, but it was
    // visited, so it stays on the map.
    const revealed = revealedNodes(map, state)
    expect(revealed.has('A')).toBe(true)
    expect(state.visited.has('A')).toBe(true)
  })

  it('travels to an adjacent road node, moving and recording the visit', () => {
    const map = lineMap()
    const state = travel(map, createGame(map, 'A'), 'B')
    expect(state.position).toBe('B')
    expect(state.visited.has('B')).toBe(true)
  })

  it('records each edge it travels, direction-independent', () => {
    const map = lineMap()
    let state = createGame(map, 'A')
    expect(state.traveled.size).toBe(0)
    state = travel(map, state, 'B')
    state = travel(map, state, 'C')
    expect(state.traveled.has(edgeKey('A', 'B'))).toBe(true)
    expect(state.traveled.has(edgeKey('B', 'C'))).toBe(true)
    // Key is unordered: the reverse spelling matches the same edge.
    expect(state.traveled.has(edgeKey('C', 'B'))).toBe(true)
    expect(state.traveled.has(edgeKey('C', 'D'))).toBe(false)
    expect(state.traveled.size).toBe(2)
  })

  it('refuses travel to a non-adjacent node', () => {
    const map = lineMap()
    const state = createGame(map, 'A')
    expect(canTravel(map, state, 'C')).toBe(false)
    expect(() => travel(map, state, 'C')).toThrow()
  })

  it('gates water edges behind a crossing capability', () => {
    const map = lineMap()
    const state = createGame(map, 'A')
    expect(canTravel(map, state, 'E')).toBe(false)
    expect(canTravel(map, state, 'E', { canCrossWater: true })).toBe(true)
    expect(() => travel(map, state, 'E')).toThrow()
    expect(travel(map, state, 'E', { canCrossWater: true }).position).toBe('E')
  })

  it('is pure: travel returns a new state and leaves the input untouched', () => {
    const map = lineMap()
    const before = createGame(map, 'A')
    const after = travel(map, before, 'B')
    expect(after).not.toBe(before)
    expect(before.position).toBe('A')
    expect(before.visited.has('B')).toBe(false)
    expect(before.traveled.size).toBe(0)
  })
})
