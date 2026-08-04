import type { MapDefinition } from './types'

// Graph-distance measurement for the map. The map's rules are all expressed as
// "at least N edges apart", so shortest-path distance is the primitive both the
// rule checks and the (upcoming) procedural generator are built on.

/** The capital-distance rules from the vault (Mechanics/Map setup.md). */
export interface CapitalRules {
  minCapitalToGoldspring: number
  minCapitalToCapital: number
}

export const CAPITAL_RULES: CapitalRules = {
  minCapitalToGoldspring: 10,
  minCapitalToCapital: 6,
}

export interface CapitalRuleReport {
  ok: boolean
  minToGoldspring: number
  minBetweenCapitals: number
  violations: string[]
}

function buildAdjacency(map: MapDefinition): Map<string, string[]> {
  const adjacency = new Map<string, string[]>()
  for (const node of map.nodes) adjacency.set(node.id, [])
  for (const edge of map.edges) {
    adjacency.get(edge.from)?.push(edge.to)
    adjacency.get(edge.to)?.push(edge.from)
  }
  return adjacency
}

/**
 * Shortest number of edges between two nodes, treating edges as undirected.
 * Returns Infinity if `to` is unreachable from `from`. Throws if either id is
 * not in the map.
 */
export function graphDistance(map: MapDefinition, from: string, to: string): number {
  const adjacency = buildAdjacency(map)
  if (!adjacency.has(from)) throw new Error(`Unknown node id: ${from}`)
  if (!adjacency.has(to)) throw new Error(`Unknown node id: ${to}`)

  const distance = new Map<string, number>([[from, 0]])
  const queue = [from]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === to) return distance.get(current)!
    for (const next of adjacency.get(current)!) {
      if (!distance.has(next)) {
        distance.set(next, distance.get(current)! + 1)
        queue.push(next)
      }
    }
  }
  return distance.get(to) ?? Infinity
}

function capitalIds(map: MapDefinition): string[] {
  return map.nodes.filter((n) => n.kind === 'capital').map((n) => n.id)
}

function goldspringId(map: MapDefinition): string {
  const goldspring = map.nodes.find((n) => n.kind === 'goldspring')
  if (!goldspring) throw new Error('Map has no Goldspring node')
  return goldspring.id
}

/** Smallest graph distance from any outer capital to Goldspring. */
export function minCapitalToGoldspring(map: MapDefinition): number {
  const goldspring = goldspringId(map)
  return Math.min(...capitalIds(map).map((id) => graphDistance(map, id, goldspring)))
}

/** Smallest graph distance between any pair of outer capitals. */
export function minCapitalPairDistance(map: MapDefinition): number {
  const capitals = capitalIds(map)
  let min = Infinity
  for (let i = 0; i < capitals.length; i++) {
    for (let j = i + 1; j < capitals.length; j++) {
      min = Math.min(min, graphDistance(map, capitals[i], capitals[j]))
    }
  }
  return min
}

/** Check a map against the capital-distance rules, listing any violations. */
export function checkCapitalRules(
  map: MapDefinition,
  rules: CapitalRules = CAPITAL_RULES,
): CapitalRuleReport {
  const minToGoldspring = minCapitalToGoldspring(map)
  const minBetweenCapitals = minCapitalPairDistance(map)
  const violations: string[] = []

  if (minToGoldspring < rules.minCapitalToGoldspring) {
    violations.push(
      `capital-to-Goldspring distance ${minToGoldspring} < ${rules.minCapitalToGoldspring}`,
    )
  }
  if (minBetweenCapitals < rules.minCapitalToCapital) {
    violations.push(
      `capital-to-capital distance ${minBetweenCapitals} < ${rules.minCapitalToCapital}`,
    )
  }

  return { ok: violations.length === 0, minToGoldspring, minBetweenCapitals, violations }
}
