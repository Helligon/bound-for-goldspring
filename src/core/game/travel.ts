// Travel and fog of war: the smallest playable loop layered on a map. The
// Captain occupies a node, sees a limited radius around it (fog), and moves
// along edges to adjacent nodes. Pure and DOM-free like the rest of the core:
// every function takes state and returns new state, so runs stay reproducible
// and the logic is testable without a browser.

import type { MapDefinition } from '../map/types'

/** Live state of a single Captain traversing a map. */
export interface GameState {
  /** The node the Captain currently occupies. */
  position: string
  /** Every node seen up close. Once visited, a node stays revealed. */
  visited: Set<string>
  /** Every edge the Captain has crossed, keyed by `edgeKey` (unordered pair). */
  traveled: Set<string>
  /**
   * How far the fog lifts, in graph hops from the current position. Base 1
   * (current node + direct neighbours). Vision skills (scout, futuresight,
   * beast master) raise this later, with no change to the reveal logic.
   */
  sight: number
}

/** Capabilities that unlock otherwise-blocked edges. */
export interface TravelCaps {
  /** Water edges need a boat and captain (see Basic gameplay.md). */
  canCrossWater?: boolean
}

/** A stable, order-independent key for the edge between two nodes. */
export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** The node ids directly linked to `id` by an edge (either direction). */
export function neighbours(map: MapDefinition, id: string): string[] {
  const out: string[] = []
  for (const e of map.edges) {
    if (e.from === id) out.push(e.to)
    else if (e.to === id) out.push(e.from)
  }
  return out
}

/** Start a run with the Captain placed at a capital. */
export function createGame(map: MapDefinition, startId: string): GameState {
  if (!map.nodes.some((n) => n.id === startId)) {
    throw new Error(`start node ${startId} is not on the map`)
  }
  return { position: startId, visited: new Set([startId]), traveled: new Set(), sight: 1 }
}

/**
 * The nodes currently on the player's map: everything within `sight` hops of
 * the current position (BFS), plus every node ever visited.
 */
export function revealedNodes(map: MapDefinition, state: GameState): Set<string> {
  const revealed = new Set(state.visited)
  revealed.add(state.position)
  let frontier = [state.position]
  for (let hop = 0; hop < state.sight; hop++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const nb of neighbours(map, id)) {
        if (!revealed.has(nb)) {
          revealed.add(nb)
          next.push(nb)
        }
      }
    }
    frontier = next
  }
  return revealed
}

/** The edge joining two nodes, if one exists. */
function edgeBetween(map: MapDefinition, a: string, b: string) {
  return map.edges.find(
    (e) => (e.from === a && e.to === b) || (e.from === b && e.to === a),
  )
}

/** Whether the Captain may move to `toId` right now. */
export function canTravel(
  map: MapDefinition,
  state: GameState,
  toId: string,
  caps: TravelCaps = {},
): boolean {
  const edge = edgeBetween(map, state.position, toId)
  if (!edge) return false // not adjacent
  if (edge.terrain === 'water' && !caps.canCrossWater) return false
  return true
}

/**
 * Move to an adjacent node, returning a new state. Throws on an illegal move
 * (not adjacent, or a gated edge the Captain cannot cross).
 */
export function travel(
  map: MapDefinition,
  state: GameState,
  toId: string,
  caps: TravelCaps = {},
): GameState {
  if (!canTravel(map, state, toId, caps)) {
    throw new Error(`cannot travel from ${state.position} to ${toId}`)
  }
  const visited = new Set(state.visited)
  visited.add(toId)
  const traveled = new Set(state.traveled)
  traveled.add(edgeKey(state.position, toId))
  return { ...state, position: toId, visited, traveled }
}
