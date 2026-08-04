import { describe, expect, it } from 'vitest'
import { MAP } from './mapData'
import {
  CAPITAL_RULES,
  checkCapitalRules,
  graphDistance,
  minCapitalPairDistance,
  minCapitalToGoldspring,
} from './distances'
import type { MapDefinition } from './types'

// A tiny disconnected map for reachability edge cases.
const SPLIT: MapDefinition = {
  nodes: [
    { id: 'a', label: 'A', kind: 'node', x: 0, y: 0 },
    { id: 'b', label: 'B', kind: 'node', x: 0, y: 0 },
    { id: 'c', label: 'C', kind: 'node', x: 0, y: 0 },
  ],
  edges: [{ from: 'a', to: 'b', terrain: 'road' }],
}

describe('graphDistance', () => {
  it('is 0 from a node to itself', () => {
    expect(graphDistance(MAP, 'goldspring', 'goldspring')).toBe(0)
  })

  it('is 1 between adjacent nodes', () => {
    expect(graphDistance(MAP, 'bookerport', 'nw-waypost')).toBe(1)
  })

  it('counts edges along the shortest multi-hop path', () => {
    // bookerport -> nw-waypost -> north-gate -> goldspring
    expect(graphDistance(MAP, 'bookerport', 'goldspring')).toBe(3)
    // bookerport -> nw-waypost -> north-gate -> ne-waypost -> ashfall
    expect(graphDistance(MAP, 'bookerport', 'ashfall')).toBe(4)
  })

  it('is symmetric (edges are undirected)', () => {
    expect(graphDistance(MAP, 'dunes', 'goldspring')).toBe(
      graphDistance(MAP, 'goldspring', 'dunes'),
    )
  })

  it('returns Infinity when there is no path', () => {
    expect(graphDistance(SPLIT, 'a', 'c')).toBe(Infinity)
  })

  it('throws for an unknown node id', () => {
    expect(() => graphDistance(MAP, 'bookerport', 'nowhere')).toThrow()
  })
})

describe('capital distance helpers', () => {
  it('reports the current placeholder map is out of spec', () => {
    // The authored starter map is deliberately too small.
    expect(minCapitalToGoldspring(MAP)).toBe(3)
    expect(minCapitalPairDistance(MAP)).toBe(4)
  })
})

describe('checkCapitalRules', () => {
  it('fails the real distance rules on the placeholder map', () => {
    const report = checkCapitalRules(MAP)
    expect(report.ok).toBe(false)
    expect(report.minToGoldspring).toBe(3)
    expect(report.minBetweenCapitals).toBe(4)
    expect(report.violations.length).toBeGreaterThan(0)
  })

  it('passes when the thresholds are lowered below the actual distances', () => {
    const report = checkCapitalRules(MAP, {
      minCapitalToGoldspring: 2,
      minCapitalToCapital: 3,
    })
    expect(report.ok).toBe(true)
    expect(report.violations).toEqual([])
  })

  it('defaults to the vault thresholds', () => {
    expect(CAPITAL_RULES).toEqual({ minCapitalToGoldspring: 10, minCapitalToCapital: 6 })
  })
})
