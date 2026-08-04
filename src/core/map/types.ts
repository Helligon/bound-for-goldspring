// The map is a graph of nodes and edges. Its *shape* is authored and stable
// (see mapData.ts); only the events at nodes change between runs (see
// generateRun.ts). This mirrors the design in the Obsidian vault:
// four Outer Capitals feeding inward to Goldspring at the centre.

export type Faction =
  | 'bookers-guild'
  | 'masked-men'
  | 'rain-tribe'
  | 'sand-riders'

// Every node belongs to a zone (biome/territory). Radially from the centre:
// the Aelder Fountain (goal), the City of Goldspring (inner ring), the Great
// Fields (grass biome surrounding the city), then the four faction zones out
// near each capital.
export type Zone =
  | 'aelder-fountain'
  | 'city-of-goldspring'
  | 'great-fields'
  | Faction

export const ZONE_LABELS: Record<Zone, string> = {
  'aelder-fountain': 'The Aelder Fountain',
  'city-of-goldspring': 'City of Goldspring',
  'great-fields': 'The Great Fields',
  'bookers-guild': 'Bookerport',
  'masked-men': 'Ashfall',
  'rain-tribe': 'Ironwood Forest',
  'sand-riders': 'The Gold Sea',
}

// Relative spatial footprint of each zone. Combined with the node count, this
// sets density (nodes / area): the two cities (Goldspring, Bookerport) are
// dense; Ashfall and Ironwood are mid; The Gold Sea is the largest and
// sparsest. The generator sizes each faction blob from these values.
export const ZONE_AREA: Record<Zone, number> = {
  'aelder-fountain': 2,
  'city-of-goldspring': 100,
  'great-fields': 900,
  'bookers-guild': 68,
  'masked-men': 90,
  'rain-tribe': 72,
  'sand-riders': 340,
}

// Encounter types a node can present. From Mechanics/Basic gameplay.md, plus
// 'tavern' (Events/Tavern.md): a combined shop/recruit/camp/wager node found on
// the roads of the Great Fields.
export type EventType =
  | 'combat'
  | 'puzzle'
  | 'wager'
  | 'train'
  | 'camp'
  | 'recruit'
  | 'shop'
  | 'tavern'

export type NodeKind =
  // The four Outer Capitals. Each sets the Captain's faction when chosen as
  // a start. Their role is fixed and they are not assigned a random event.
  | 'capital'
  // The single End Capital at the map centre. The run's goal.
  | 'goldspring'
  // An ordinary travel node. Gets a random event each run.
  | 'node'

export type Terrain = 'road' | 'water'

export interface MapNode {
  id: string
  label: string
  kind: NodeKind
  /** Layout position for rendering. Authored by hand; no auto-layout. */
  x: number
  y: number
  /** Set only for capital nodes. */
  faction?: Faction
  /** Which zone/biome this node belongs to. Assigned by the map generator. */
  zone?: Zone
  /** True for nodes strung along a river (a navigable waterway node). */
  river?: boolean
  /**
   * If true, this node may be inactive on a given run (part of the
   * "fixed capitals + variable interior" idea). Capitals and Goldspring
   * are never optional.
   */
  optional?: boolean
}

export interface MapEdge {
  from: string
  to: string
  /** Water edges need a boat and captain to cross (see Basic gameplay.md). */
  terrain: Terrain
}

// A zone's drawn region. The generator defines these and assigns node zones by
// containment, so no node ever sits in the wrong zone's outline. The renderer
// draws these exact shapes.
export type ZoneRegion =
  | { zone: Zone; kind: 'circle'; cx: number; cy: number; r: number }
  | { zone: Zone; kind: 'polygon'; points: { x: number; y: number }[] }

/** The authored, run-independent map. */
export interface MapDefinition {
  nodes: MapNode[]
  regions?: ZoneRegion[]
  /** Meandering water courses; edges crossing one are `terrain: 'water'`. */
  rivers?: { x: number; y: number }[][]
  edges: MapEdge[]
}

/** Per-run state layered on top of a node: is it active, and what happens there. */
export interface RunNode {
  id: string
  active: boolean
  event?: EventType
}

/** The result of seeding a single run against a MapDefinition. */
export interface RunMap {
  seed: string
  nodes: Record<string, RunNode>
}
