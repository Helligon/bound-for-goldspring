import { describe, expect, it } from 'vitest'
import { MAP } from './mapData'
import { growMap } from './growMap'
import { generateRun } from './generateRun'
import type { EventType, Zone } from './types'

// Events generateRun is allowed to assign. 'puzzle' is deliberately excluded
// for now (no puzzle rules exist yet), so it must never appear.
const ALLOWED_EVENTS: EventType[] = ['combat', 'wager', 'train', 'camp', 'recruit', 'shop']

describe('generateRun', () => {
  it('is reproducible for the same seed', () => {
    expect(generateRun(MAP, 'run-42')).toEqual(generateRun(MAP, 'run-42'))
  })

  it('produces a run node for every map node', () => {
    const run = generateRun(MAP, 'run-42')
    for (const node of MAP.nodes) {
      expect(run.nodes[node.id]).toBeDefined()
    }
    expect(Object.keys(run.nodes)).toHaveLength(MAP.nodes.length)
  })

  it('records the seed it was generated from', () => {
    expect(generateRun(MAP, 'abc').seed).toBe('abc')
  })

  it('assigns an event to every active travel node and none to capitals', () => {
    const run = generateRun(MAP, 'run-42')
    for (const node of MAP.nodes) {
      const runNode = run.nodes[node.id]
      if (node.kind === 'node') {
        if (runNode.active) expect(runNode.event).toBeDefined()
        else expect(runNode.event).toBeUndefined()
      } else {
        // Capitals and Goldspring: always active, never an event.
        expect(runNode.active).toBe(true)
        expect(runNode.event).toBeUndefined()
      }
    }
  })

  it('only ever assigns events from the allowed pool (never puzzle)', () => {
    for (let i = 0; i < 50; i++) {
      const run = generateRun(MAP, `seed-${i}`)
      for (const runNode of Object.values(run.nodes)) {
        if (runNode.event) expect(ALLOWED_EVENTS).toContain(runNode.event)
      }
    }
  })

  it('never deactivates a non-optional node', () => {
    for (let i = 0; i < 50; i++) {
      const run = generateRun(MAP, `vary-${i}`)
      for (const node of MAP.nodes) {
        if (!node.optional) expect(run.nodes[node.id].active).toBe(true)
      }
    }
  })

  it('varies optional-node activity across seeds', () => {
    const optionalIds = MAP.nodes.filter((n) => n.optional).map((n) => n.id)
    expect(optionalIds.length).toBeGreaterThan(0)

    const states = new Set<boolean>()
    for (let i = 0; i < 50; i++) {
      const run = generateRun(MAP, `spread-${i}`)
      for (const id of optionalIds) states.add(run.nodes[id].active)
    }
    // Over many seeds we expect to see optional nodes both active and inactive.
    expect(states).toEqual(new Set([true, false]))
  })
})

describe('generateRun zone event rules', () => {
  const SEEDS = Array.from({ length: 12 }, (_, i) => `zrun-${i}`)

  // Collect the events assigned to nodes of a given zone, across seeds.
  function eventsInZone(zone: Zone): Set<EventType> {
    const events = new Set<EventType>()
    for (const seed of SEEDS) {
      const map = growMap(seed)
      const run = generateRun(map, seed)
      for (const node of map.nodes) {
        if (node.zone === zone && run.nodes[node.id].event) {
          events.add(run.nodes[node.id].event!)
        }
      }
    }
    return events
  }

  const subsetOf = (allowed: EventType[]) => (got: Set<EventType>) =>
    [...got].every((e) => allowed.includes(e))

  it('leaves capitals and the fountain without events', () => {
    const map = growMap('caps')
    const run = generateRun(map, 'caps')
    for (const node of map.nodes) {
      if (node.kind !== 'node') expect(run.nodes[node.id].event).toBeUndefined()
    }
  })

  it('City of Goldspring: has >=1 each of shop/wager/recruit and no camp/train', () => {
    for (const seed of SEEDS) {
      const map = growMap(seed)
      const run = generateRun(map, seed)
      const events = map.nodes
        .filter((n) => n.zone === 'city-of-goldspring')
        .map((n) => run.nodes[n.id].event)
      expect(events).toContain('shop')
      expect(events).toContain('wager')
      expect(events).toContain('recruit')
      expect(events).not.toContain('camp')
      expect(events).not.toContain('train')
    }
  })

  it('Great Fields: no shop/recruit/wager, and taverns do appear', () => {
    const events = eventsInZone('great-fields')
    expect(subsetOf(['combat', 'camp', 'train', 'tavern'])(events)).toBe(true)
    expect(events.has('tavern')).toBe(true) // occasional, but present across seeds
  })

  it('Ashfall (Masked Men): only train/recruit/combat', () => {
    expect(subsetOf(['train', 'recruit', 'combat'])(eventsInZone('masked-men'))).toBe(true)
  })

  it('Bookerport (Bookers Guild): no combat or wager', () => {
    const events = eventsInZone('bookers-guild')
    expect(events.has('combat')).toBe(false)
    expect(events.has('wager')).toBe(false)
  })

  it('Ironwood (Rain Tribe): no wager', () => {
    expect(eventsInZone('rain-tribe').has('wager')).toBe(false)
  })

  it('The Gold Sea (Sand Riders): no shop or train', () => {
    const events = eventsInZone('sand-riders')
    expect(events.has('shop')).toBe(false)
    expect(events.has('train')).toBe(false)
  })

  it('never places a tavern outside the Great Fields', () => {
    for (const seed of SEEDS) {
      const map = growMap(seed)
      const run = generateRun(map, seed)
      for (const node of map.nodes) {
        if (run.nodes[node.id].event === 'tavern') expect(node.zone).toBe('great-fields')
      }
    }
  })
})
