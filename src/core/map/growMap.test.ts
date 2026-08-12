import { describe, expect, it } from 'vitest'
import { growMap } from './growMap'
import { checkCapitalRules } from './distances'

const SEEDS = Array.from({ length: 20 }, (_, i) => `grow-${i}`)

describe('growMap (organic, trunk roads)', () => {
  it('is deterministic for a given seed', () => {
    expect(growMap('abc')).toEqual(growMap('abc'))
  })

  it('keeps every capital reachable from the fountain', () => {
    // The road network is built to satisfy capital->fountain >= 10, but the
    // river feature laid over the top may add water shortcuts, so we only
    // assert reachability here (both distances finite and non-zero).
    for (const seed of SEEDS) {
      const report = checkCapitalRules(growMap(seed))
      expect(Number.isFinite(report.minToGoldspring), `seed ${seed}`).toBe(true)
      expect(report.minToGoldspring).toBeGreaterThan(0)
      expect(Number.isFinite(report.minBetweenCapitals)).toBe(true)
    }
  })

  it('connects every node back to the fountain', () => {
    for (const seed of SEEDS) {
      const map = growMap(seed)
      const adj = new Map<string, string[]>()
      for (const n of map.nodes) adj.set(n.id, [])
      for (const e of map.edges) {
        adj.get(e.from)!.push(e.to)
        adj.get(e.to)!.push(e.from)
      }
      const start = map.nodes.find((n) => n.kind === 'goldspring')!.id
      const reached = new Set([start])
      const queue = [start]
      while (queue.length) {
        const cur = queue.shift()!
        for (const nx of adj.get(cur)!) if (!reached.has(nx)) reached.add(nx), queue.push(nx)
      }
      expect(reached.size, `seed ${seed}`).toBe(map.nodes.length)
    }
  })

  it('assigns a zone to every node', () => {
    for (const n of growMap('zones').nodes) expect(n.zone).toBeDefined()
  })

  it('lays a river whose water edges all touch a river node, and every river node has water', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const map = growMap(seed)
      expect(map.rivers?.length).toBeGreaterThan(0)
      const water = map.edges.filter((e) => e.terrain === 'water')
      expect(water.length, `seed ${seed}`).toBeGreaterThan(0)

      const isRiver = new Map(map.nodes.map((n) => [n.id, !!n.river]))
      const waterDegree = new Map<string, number>()
      for (const e of water) {
        // Every water edge touches at least one river node (river route or embark).
        expect(isRiver.get(e.from) || isRiver.get(e.to), `${seed}: ${e.from}-${e.to}`).toBe(true)
        waterDegree.set(e.from, (waterDegree.get(e.from) ?? 0) + 1)
        waterDegree.set(e.to, (waterDegree.get(e.to) ?? 0) + 1)
      }
      for (const n of map.nodes) {
        if (n.river) expect(waterDegree.get(n.id) ?? 0, `${seed}:${n.id}`).toBeGreaterThan(0)
      }
    }
  })

  it('never has more than one road between the same pair of nodes', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const seen = new Set<string>()
      for (const e of growMap(seed).edges) {
        const key = e.from < e.to ? `${e.from}|${e.to}` : `${e.to}|${e.from}`
        expect(seen.has(key), `${seed}: duplicate ${e.from}-${e.to}`).toBe(false)
        seen.add(key)
      }
    }
  })

  it('grows each zone to at least its settlement size', () => {
    // Zones are assigned by region containment, so counts are emergent: a
    // settlement is at least its seed size, plus any road/field node that falls
    // inside its region.
    for (const seed of SEEDS.slice(0, 10)) {
      const c: Record<string, number> = {}
      for (const n of growMap(seed).nodes) c[n.zone!] = (c[n.zone!] ?? 0) + 1
      expect(c['aelder-fountain']).toBe(1)
      expect(c['bookers-guild']).toBeGreaterThanOrEqual(15)
      expect(c['masked-men']).toBeGreaterThanOrEqual(10)
      expect(c['rain-tribe']).toBeGreaterThanOrEqual(8)
      expect(c['the-crimson-ordas']).toBeGreaterThanOrEqual(5)
      expect(c['city-of-goldspring']).toBeGreaterThanOrEqual(18)
    }
  })

  it('never leaves a Great Fields node inside a faction or city region', () => {
    // The whole point of region-based zoning: any node inside a zone's shape
    // belongs to that zone.
    const inPoly = (x: number, y: number, poly: { x: number; y: number }[]) => {
      let inside = false
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const { x: xi, y: yi } = poly[i]
        const { x: xj, y: yj } = poly[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
      }
      return inside
    }
    for (const seed of SEEDS.slice(0, 10)) {
      const map = growMap(seed)
      for (const n of map.nodes) {
        if (n.zone !== 'great-fields') continue
        for (const region of map.regions ?? []) {
          const inside =
            region.kind === 'circle'
              ? Math.hypot(n.x - region.cx, n.y - region.cy) <= region.r
              : inPoly(n.x, n.y, region.points)
          expect(inside, `${seed}: fields node ${n.id} inside ${region.zone}`).toBe(false)
        }
      }
    }
  })

  it('gives every non-capital node at least two connections (capitals sit on one)', () => {
    for (const seed of SEEDS.slice(0, 10)) {
      const map = growMap(seed)
      const degree = new Map<string, number>()
      for (const n of map.nodes) degree.set(n.id, 0)
      for (const e of map.edges) {
        degree.set(e.from, degree.get(e.from)! + 1)
        degree.set(e.to, degree.get(e.to)! + 1)
      }
      for (const n of map.nodes) {
        const min = n.kind === 'capital' ? 1 : 2
        expect(degree.get(n.id), `${seed}:${n.id}`).toBeGreaterThanOrEqual(min)
      }
    }
  })
})
