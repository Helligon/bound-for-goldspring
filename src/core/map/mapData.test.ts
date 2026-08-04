import { describe, expect, it } from 'vitest'
import { MAP } from './mapData'

// Structural invariants for the authored map. As the map grows by hand, these
// catch the mistakes that are easy to make in the data: dangling edges,
// duplicate ids, a capital missing its faction, an orphaned node.

const nodeIds = new Set(MAP.nodes.map((n) => n.id))

describe('MAP structure', () => {
  it('has unique node ids', () => {
    expect(nodeIds.size).toBe(MAP.nodes.length)
  })

  it('has exactly four capitals, each with a distinct faction', () => {
    const capitals = MAP.nodes.filter((n) => n.kind === 'capital')
    expect(capitals).toHaveLength(4)
    for (const c of capitals) expect(c.faction).toBeDefined()
    const factions = new Set(capitals.map((c) => c.faction))
    expect(factions.size).toBe(4)
  })

  it('has exactly one Goldspring node', () => {
    expect(MAP.nodes.filter((n) => n.kind === 'goldspring')).toHaveLength(1)
  })

  it('only marks ordinary travel nodes as optional', () => {
    for (const n of MAP.nodes) {
      if (n.optional) expect(n.kind).toBe('node')
    }
  })

  it('has edges that reference existing nodes and are not self-loops', () => {
    for (const edge of MAP.edges) {
      expect(nodeIds.has(edge.from)).toBe(true)
      expect(nodeIds.has(edge.to)).toBe(true)
      expect(edge.from).not.toBe(edge.to)
    }
  })

  it('has no duplicate edges (treating them as undirected)', () => {
    const seen = new Set<string>()
    for (const edge of MAP.edges) {
      const key = [edge.from, edge.to].sort().join('::')
      expect(seen.has(key)).toBe(false)
      seen.add(key)
    }
  })

  it('is fully connected (every node reachable from Goldspring)', () => {
    const adjacency = new Map<string, string[]>()
    for (const id of nodeIds) adjacency.set(id, [])
    for (const edge of MAP.edges) {
      adjacency.get(edge.from)!.push(edge.to)
      adjacency.get(edge.to)!.push(edge.from)
    }

    const start = MAP.nodes.find((n) => n.kind === 'goldspring')!.id
    const reached = new Set<string>([start])
    const queue = [start]
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const next of adjacency.get(current)!) {
        if (!reached.has(next)) {
          reached.add(next)
          queue.push(next)
        }
      }
    }

    expect(reached.size).toBe(nodeIds.size)
  })
})
