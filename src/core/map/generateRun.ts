import { Rng } from '../rng'
import type { EventType, MapDefinition, RunMap, RunNode, Zone } from './types'

// Event assignment is zone-aware (rules from chat.md). Each zone has a pool of
// events it may present; some zones add extra constraints handled below.
// 'puzzle' is omitted everywhere for now (no puzzle rules exist yet), and
// 'tavern' only ever appears in the Great Fields (Events/Tavern.md).
const ZONE_EVENTS: Partial<Record<Zone, EventType[]>> = {
  'city-of-goldspring': ['shop', 'wager', 'recruit', 'combat'],
  'great-fields': ['combat', 'combat', 'camp', 'train'], // tavern injected separately
  'masked-men': ['train', 'recruit', 'combat'],
  'bookers-guild': ['shop', 'recruit', 'camp', 'train'],
  'rain-tribe': ['combat', 'train', 'camp', 'recruit', 'shop'],
  'the-crimson-ordas': ['combat', 'wager', 'camp', 'recruit'],
}

// Fallback for nodes without a zone (e.g. the legacy MAP fixture).
const FALLBACK_EVENTS: EventType[] = ['combat', 'combat', 'combat', 'wager', 'train', 'camp', 'recruit', 'shop']

// The City of Goldspring must offer at least one of each of these.
const CITY_REQUIRED: EventType[] = ['shop', 'wager', 'recruit']

/** Chance a Great Fields node is a tavern rather than a plain field event. */
const TAVERN_CHANCE = 0.18

/** Chance that an optional node is active on a given run. */
const OPTIONAL_ACTIVE_CHANCE = 0.7

/** Deterministic Fisher-Yates shuffle driven by the run's Rng. */
function shuffled<T>(items: T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function pickEvent(zone: Zone | undefined, rng: Rng): EventType {
  if (zone === 'great-fields') {
    if (rng.chance(TAVERN_CHANCE)) return 'tavern'
    return rng.pick(ZONE_EVENTS['great-fields']!)
  }
  const pool = (zone && ZONE_EVENTS[zone]) || FALLBACK_EVENTS
  return rng.pick(pool)
}

/**
 * Seed a single run against a map: which optional nodes are active, and what
 * event each active travel node presents, honouring per-zone rules. Same seed
 * in -> same RunMap out.
 */
export function generateRun(map: MapDefinition, seed: string): RunMap {
  const rng = new Rng(`run:${seed}`)
  const nodes: Record<string, RunNode> = {}
  const cityIds: string[] = []

  for (const node of map.nodes) {
    // Capitals and the fountain have fixed roles and no random event.
    if (node.kind !== 'node') {
      nodes[node.id] = { id: node.id, active: true }
      continue
    }

    const active = node.optional ? rng.chance(OPTIONAL_ACTIVE_CHANCE) : true
    if (!active) {
      nodes[node.id] = { id: node.id, active: false }
      continue
    }

    // The city is assigned in a second pass so we can guarantee coverage.
    if (node.zone === 'city-of-goldspring') {
      cityIds.push(node.id)
      nodes[node.id] = { id: node.id, active: true }
    } else {
      nodes[node.id] = { id: node.id, active: true, event: pickEvent(node.zone, rng) }
    }
  }

  // City of Goldspring: force one of each required event onto distinct nodes,
  // then fill the rest from the city pool. With 20-25 city nodes there is
  // always room for the three required types.
  const cityPool = ZONE_EVENTS['city-of-goldspring']!
  shuffled(cityIds, rng).forEach((id, i) => {
    nodes[id].event = i < CITY_REQUIRED.length ? CITY_REQUIRED[i] : rng.pick(cityPool)
  })

  return { seed, nodes }
}
