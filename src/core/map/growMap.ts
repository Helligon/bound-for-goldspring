import { Rng } from '../rng'
import { MAP } from './mapData'
import type { Faction, MapDefinition, MapEdge, MapNode, Zone, ZoneRegion } from './types'

// Runtime-tunable generation parameters (driven by the browser sliders).
export interface GenConfig {
  minNodeDist?: number
  fieldsDensity?: number
}

// Baseline node spacing; the "Min node spacing" slider scales everything
// (blob radii, spacing, edge caps) relative to this. DEFAULT_SPACING is the
// preferred default when no slider value is supplied.
const BASE_SPACING = 115
const DEFAULT_SPACING = 320
const DEFAULT_DENSITY = 0.16

// An "organically grown" map generator (work in progress):
//   - fixed centre + capitals
//   - each capital sits at the BACK of its zone (furthest from the centre),
//     joined to its settlement by a single, longer link
//   - the settlement blob sits in front of the capital (toward the centre)
//   - a winding trunk road leaves the front of the settlement for the centre
//   - a city blob grows around the fountain
//   - (todo) filler nodes in the Great Fields
//
// Zones are assigned by REGION (city = circle, factions = organic hulls): any
// node inside a shape belongs to that zone, so no Great Fields node sits inside
// a faction/city outline. Each trunk is >= 10 hops, so capital -> fountain >= 10.

const TRUNK_WAYPOINTS = 11
const PLACE_TRIES = 16
const CITY_BLOB = 18

const FACTION_COUNTS: Record<Faction, number> = {
  'bookers-guild': 15,
  'masked-men': 10,
  'rain-tribe': 8,
  'the-crimson-ordas': 5,
}

// Blob tightness per faction. Bookerport is a city, so it packs dense (small
// spread + spacing) like Goldspring; the others are looser.
const BLOB_SPREAD: Record<Faction, number> = {
  'bookers-guild': 46,
  'masked-men': 70,
  'rain-tribe': 70,
  'the-crimson-ordas': 74,
}
const BLOB_SPACING: Record<Faction, number> = {
  'bookers-guild': 84,
  'masked-men': 110,
  'rain-tribe': 110,
  'the-crimson-ordas': 118,
}

const ERRATIC: Record<Faction, number> = {
  'rain-tribe': 0.22,
  'masked-men': 0.13,
  'bookers-guild': 0.08,
  'the-crimson-ordas': 0.05,
}

const ZONE_PAD: Record<string, number> = {
  'the-crimson-ordas': 700,
  'masked-men': 90,
  'rain-tribe': 90,
  'bookers-guild': 80,
}
const CITY_PAD = 55

// Zone-specific maximum edge length: long roads across the open desert, short
// hops inside the dense city.
const ZONE_MAX_EDGE: Record<string, number> = {
  'the-crimson-ordas': 1000,
  'great-fields': 700,
  'city-of-goldspring': 320,
  'bookers-guild': 360,
  'masked-men': 460,
  'rain-tribe': 460,
}
const maxEdgeFor = (zone: Zone | undefined) => (zone && ZONE_MAX_EDGE[zone]) ?? 600

type Pt = { x: number; y: number }
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by)

function convexHull(points: Pt[]): Pt[] {
  if (points.length < 3) return points
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const half = (src: Pt[]) => {
    const h: Pt[] = []
    for (const p of src) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop()
      h.push(p)
    }
    h.pop()
    return h
  }
  return [...half(pts), ...half([...pts].reverse())]
}

const hash01 = (i: number) => {
  const v = Math.sin(i * 12.9898) * 43758.5453
  return v - Math.floor(v)
}

function expandVaried(hull: Pt[], pad: number): Pt[] {
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length
  return hull.map((p, i) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const len = Math.hypot(dx, dy) || 1
    const p2 = pad * (0.7 + 0.6 * hash01(i + 1))
    return { x: p.x + (dx / len) * p2, y: p.y + (dy / len) * p2 }
  })
}

// Expand a hull with a directional bias: vertices facing away from the map
// centre (and to the sides) grow a lot; vertices facing the centre barely grow.
// Used for the Gold Sea so the desert sprawls outward/sideways, not inward.
function expandDirectional(hull: Pt[], pad: number, mapCx: number, mapCy: number): Pt[] {
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length
  const olen = Math.hypot(cx - mapCx, cy - mapCy) || 1
  const orx = (cx - mapCx) / olen // outward reference (map centre -> region)
  const ory = (cy - mapCy) / olen
  return hull.map((p, i) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const len = Math.hypot(dx, dy) || 1
    const dxn = dx / len
    const dyn = dy / len
    const align = dxn * orx + dyn * ory // -1 inward, 0 sideways, +1 outward
    const mult = align <= 0 ? 0.12 + 0.88 * (align + 1) : 1 + 0.7 * align
    const p2 = pad * mult * (0.75 + 0.5 * hash01(i + 1))
    return { x: p.x + dxn * p2, y: p.y + dyn * p2 }
  })
}

function pointInPolygon(x: number, y: number, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function anchors(): MapNode[] {
  return MAP.nodes.filter((n) => n.kind !== 'node').map((n) => ({ ...n }))
}

function build(seed: string, cfg: GenConfig = {}): MapDefinition {
  const rng = new Rng(`grow:${seed}`)
  // Spacing scale from the slider: bigger => everything spreads further apart.
  const scale = (cfg.minNodeDist ?? DEFAULT_SPACING) / BASE_SPACING
  const scaledMax = (zone: Zone | undefined) => maxEdgeFor(zone) * scale
  const raw = anchors()
  const rawFountain = raw.find((n) => n.kind === 'goldspring')!
  const cx = rawFountain.x
  const cy = rawFountain.y
  const fountain: MapNode = { ...rawFountain, label: 'The Aelder Fountain', zone: 'aelder-fountain' }
  // Scale the capitals out from the centre by the same factor, so the whole
  // world (trunk roads included) spreads uniformly, not just the blobs.
  const capitals = raw
    .filter((n) => n.kind === 'capital')
    .map((c) => ({
      ...c,
      zone: c.faction!,
      x: cx + (c.x - cx) * scale,
      y: cy + (c.y - cy) * scale,
    }))

  const nodes: MapNode[] = [fountain, ...capitals]
  const edges: MapEdge[] = []
  let counter = 0
  // Dedupe: never add a second road between the same pair of nodes.
  const linked = new Set<string>()
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const link = (a: MapNode, b: MapNode, water = false) => {
    if (a.id === b.id) return
    const key = pairKey(a.id, b.id)
    if (linked.has(key)) return
    linked.add(key)
    edges.push({ from: a.id, to: b.id, terrain: water ? 'water' : 'road' })
  }
  const addNode = (zone: Zone, x: number, y: number, river = false): MapNode => {
    const id = `g${counter++}`
    const node: MapNode = { id, label: id, kind: 'node', zone, x, y }
    if (river) node.river = true
    nodes.push(node)
    return node
  }
  const nearestIn = (from: Pt, pool: MapNode[], k: number): MapNode[] =>
    pool
      .map((n) => ({ n, d: dist(from.x, from.y, n.x, n.y) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k)
      .map((o) => o.n)

  // A winding road from `start` to the fountain (>= TRUNK_WAYPOINTS + 1 hops).
  const buildTrunk = (start: MapNode, faction: Faction) => {
    const dx = cx - start.x
    const dy = cy - start.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const maxDev = (ERRATIC[faction] ?? 0.1) * len
    let offset = 0
    let prev = start
    for (let i = 1; i <= TRUNK_WAYPOINTS; i++) {
      const f = i / (TRUNK_WAYPOINTS + 1)
      offset = Math.max(-maxDev, Math.min(maxDev, offset * 0.6 + (rng.float() - 0.5) * maxDev))
      const taper = Math.sin(Math.PI * f)
      const x = start.x + dx * f + nx * offset * taper
      const y = start.y + dy * f + ny * offset * taper
      const node = addNode('great-fields', x, y)
      link(prev, node)
      prev = node
    }
    link(prev, fountain)
  }

  // Scatter `count` nodes in a disk, spaced apart. `connectPool` (grown as we
  // go) is what each new node wires to its two nearest of.
  const growBlob = (
    centre: Pt,
    count: number,
    radius: number,
    spacing: number,
    zone: Zone,
    connectPool: MapNode[],
    links: number,
  ): MapNode[] => {
    const made: MapNode[] = []
    for (let n = 0; n < count; n++) {
      let best: Pt = { x: centre.x, y: centre.y }
      let bestClear = -1
      for (let t = 0; t < PLACE_TRIES; t++) {
        const angle = rng.float() * 2 * Math.PI
        const r = Math.sqrt(rng.float()) * radius
        const x = centre.x + Math.cos(angle) * r
        const y = centre.y + Math.sin(angle) * r
        let clear = Infinity
        for (const nd of nodes) clear = Math.min(clear, dist(x, y, nd.x, nd.y))
        if (clear >= spacing) {
          best = { x, y }
          break
        }
        if (clear > bestClear) {
          bestClear = clear
          best = { x, y }
        }
      }
      const node = addNode(zone, best.x, best.y)
      for (const nb of nearestIn(node, connectPool, links)) {
        if (dist(node.x, node.y, nb.x, nb.y) <= scaledMax(zone)) link(node, nb)
      }
      connectPool.push(node)
      made.push(node)
    }
    return made
  }

  // --- Faction settlements: capital at the back, blob in front, one long link,
  // then a road from the front of the blob to the centre.
  for (const capital of capitals) {
    const faction = capital.faction!
    const need = FACTION_COUNTS[faction] - 1
    const radius = (40 + Math.sqrt(need) * BLOB_SPREAD[faction]) * scale
    const ix = (cx - capital.x) / (Math.hypot(cx - capital.x, cy - capital.y) || 1)
    const iy = (cy - capital.y) / (Math.hypot(cx - capital.x, cy - capital.y) || 1)
    const blobCentre = { x: capital.x + ix * radius * 0.95, y: capital.y + iy * radius * 0.95 }
    const blob = growBlob(blobCentre, need, radius, BLOB_SPACING[faction] * scale, faction, [], 1)

    // Single, longer link from the capital (back) to the nearest settlement node.
    const back = nearestIn(capital, blob, 1)[0]
    if (back) link(capital, back)
    // Trunk road leaves the front of the settlement (node nearest the centre).
    const gate = nearestIn({ x: cx, y: cy }, blob, 1)[0] ?? capital
    buildTrunk(gate, faction)
  }

  // --- City blob around the fountain (webs onto the trunk ends and each other).
  growBlob(
    { x: cx, y: cy },
    CITY_BLOB,
    (40 + Math.sqrt(CITY_BLOB) * 46) * scale,
    86 * scale,
    'city-of-goldspring',
    nodes.filter((n) => n.id !== fountain.id),
    2,
  )

  // --- Zone regions, then assign every node by containment.
  const regions: ZoneRegion[] = []
  const cityPts = nodes.filter((n) => n.zone === 'city-of-goldspring')
  const cityR = Math.max(...cityPts.map((p) => dist(p.x, p.y, cx, cy)), 1) + CITY_PAD
  regions.push({ zone: 'city-of-goldspring', kind: 'circle', cx, cy, r: cityR })

  const factionPolys: { zone: Faction; points: Pt[] }[] = []
  for (const capital of capitals) {
    const seed = nodes.filter((n) => n.zone === capital.faction).map((n) => ({ x: n.x, y: n.y }))
    const hull = convexHull(seed)
    // The Gold Sea desert sprawls outward/sideways only, not toward the centre.
    const poly =
      capital.faction === 'the-crimson-ordas'
        ? expandDirectional(hull, ZONE_PAD['the-crimson-ordas'], cx, cy)
        : expandVaried(hull, ZONE_PAD[capital.faction!] ?? 80)
    factionPolys.push({ zone: capital.faction!, points: poly })
    regions.push({ zone: capital.faction!, kind: 'polygon', points: poly })
  }

  // --- Fillers: scatter Great Fields nodes into the open country between zones
  // (outside every region), each wired to its nearest 2 (rarely 3). Density
  // follows the slider; spacing follows the world scale.
  const inAnyRegion = (x: number, y: number) =>
    dist(x, y, cx, cy) <= cityR || factionPolys.some((fp) => pointInPolygon(x, y, fp.points))
  const target = Math.round((cfg.fieldsDensity ?? DEFAULT_DENSITY) * 600)
  const minGap = (cfg.minNodeDist ?? DEFAULT_SPACING) * 0.85
  const xs = nodes.map((n) => n.x)
  const ys = nodes.map((n) => n.y)
  const minX = Math.min(...xs) - minGap
  const maxX = Math.max(...xs) + minGap
  const minY = Math.min(...ys) - minGap
  const maxY = Math.max(...ys) + minGap
  const fillers: MapNode[] = []
  for (let tries = 0; fillers.length < target && tries < target * 60; tries++) {
    const x = minX + rng.float() * (maxX - minX)
    const y = minY + rng.float() * (maxY - minY)
    if (inAnyRegion(x, y)) continue
    let ok = true
    for (const nd of nodes) {
      if (dist(x, y, nd.x, nd.y) < minGap) {
        ok = false
        break
      }
    }
    if (ok) fillers.push(addNode('great-fields', x, y))
  }
  for (const f of fillers) {
    const k = rng.chance(0.15) ? 3 : 2
    for (const nb of nearestIn(f, nodes.filter((n) => n.id !== f.id), k)) {
      if (dist(f.x, f.y, nb.x, nb.y) <= scaledMax('great-fields')) link(f, nb)
    }
  }

  for (const node of nodes) {
    if (node.kind !== 'node') continue
    if (dist(node.x, node.y, cx, cy) <= cityR) {
      node.zone = 'city-of-goldspring'
      continue
    }
    const owner = factionPolys.find((fp) => pointInPolygon(node.x, node.y, fp.points))
    node.zone = owner ? owner.zone : 'great-fields'
  }

  // --- Every node (except capitals, which keep their single back link) gets at
  // least two connections; prefer links within the zone's max edge.
  const degree = new Map<string, number>()
  const edgeKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const existing = new Set<string>()
  for (const n of nodes) degree.set(n.id, 0)
  for (const e of edges) {
    degree.set(e.from, degree.get(e.from)! + 1)
    degree.set(e.to, degree.get(e.to)! + 1)
    existing.add(edgeKey(e.from, e.to))
  }
  for (const node of nodes) {
    if (node.kind === 'capital') continue
    while ((degree.get(node.id) ?? 0) < 2) {
      const ranked = nearestIn(node, nodes, nodes.length).filter(
        (o) => o.id !== node.id && !existing.has(edgeKey(node.id, o.id)),
      )
      const cap = scaledMax(node.zone)
      const candidate = ranked.find((o) => dist(node.x, node.y, o.x, o.y) <= cap) ?? ranked[0]
      if (!candidate) break
      link(node, candidate)
      existing.add(edgeKey(node.id, candidate.id))
      degree.set(node.id, (degree.get(node.id) ?? 0) + 1)
      degree.set(candidate.id, (degree.get(candidate.id) ?? 0) + 1)
    }
  }

  // --- Connectivity repair: link any stranded component (e.g. a pair of fillers
  // that only found each other) to the nearest node already reachable.
  const adj = new Map<string, string[]>()
  for (const n of nodes) adj.set(n.id, [])
  for (const e of edges) {
    adj.get(e.from)!.push(e.to)
    adj.get(e.to)!.push(e.from)
  }
  const reachFrom = (startId: string) => {
    const seen = new Set([startId])
    const queue = [startId]
    while (queue.length) {
      const cur = queue.shift()!
      for (const nx of adj.get(cur)!) if (!seen.has(nx)) seen.add(nx), queue.push(nx)
    }
    return seen
  }
  let reached = reachFrom(fountain.id)
  const byId = new Map(nodes.map((n) => [n.id, n]))
  for (let guard = 0; reached.size < nodes.length && guard < nodes.length; guard++) {
    const stranded = nodes.find((n) => !reached.has(n.id))!
    const target2 = [...reached]
      .map((id) => byId.get(id)!)
      .sort((a, b) => dist(stranded.x, stranded.y, a.x, a.y) - dist(stranded.x, stranded.y, b.x, b.y))[0]
    link(stranded, target2)
    adj.get(stranded.id)!.push(target2.id)
    adj.get(target2.id)!.push(stranded.id)
    reached = reachFrom(fountain.id)
  }

  // --- Waterways: a river biased to Bookerport, running off the bottom-left
  // corner, with nodes strung along it at random spacing and joined by water.
  // Nodes crossing a zone take that zone; road edges crossing the river become
  // water fords. (Distance rules are deliberately not preserved for the river.)
  const zoneAt = (x: number, y: number): Zone => {
    for (const rg of regions) {
      if (rg.kind === 'circle') {
        if (dist(x, y, rg.cx, rg.cy) <= rg.r) return rg.zone
      } else if (pointInPolygon(x, y, rg.points)) return rg.zone
    }
    return 'great-fields'
  }
  const bookerport = capitals.find((c) => c.faction === 'bookers-guild')!
  const rxs = nodes.map((n) => n.x)
  const rys = nodes.map((n) => n.y)
  const rMinX = Math.min(...rxs)
  const rMaxX = Math.max(...rxs)
  const rMinY = Math.min(...rys)
  const rMaxY = Math.max(...rys)
  const rSpanX = rMaxX - rMinX
  const rSpanY = rMaxY - rMinY
  const span = Math.max(rSpanX, rSpanY)
  // Source sits ON the top or right edge (top-right biased so the river crosses
  // diagonally, not along an edge); the sink is Bookerport, the port at the
  // river mouth. The river runs through Goldspring or bows around it.
  const source = rng.chance(0.5)
    ? { x: rMinX + (0.4 + rng.float() * 0.6) * rSpanX, y: rMinY } // top edge, right side
    : { x: rMaxX, y: rMinY + rng.float() * 0.6 * rSpanY } // right edge, upper part
  const sink = { x: bookerport.x, y: bookerport.y }
  const mdx = sink.x - source.x
  const mdy = sink.y - source.y
  const mLen = Math.hypot(mdx, mdy) || 1
  const rpx = -mdy / mLen
  const rpy = mdx / mLen
  const side = rng.chance(0.5) ? 1 : -1
  const control = rng.chance(0.5)
    ? { x: cx, y: cy }
    : { x: cx + rpx * span * 0.45 * side, y: cy + rpy * span * 0.45 * side }
  const rAmp = span * 0.16
  const riverLine: Pt[] = []
  let ro = 0
  for (let i = 0; i <= 40; i++) {
    const t = i / 40
    const mt = 1 - t
    const bx = mt * mt * source.x + 2 * mt * t * control.x + t * t * sink.x
    const by = mt * mt * source.y + 2 * mt * t * control.y + t * t * sink.y
    ro = Math.max(-rAmp, Math.min(rAmp, ro + (rng.float() - 0.5) * rAmp * 1.1))
    const taper = Math.sin(Math.PI * t)
    riverLine.push({ x: bx + rpx * ro * taper, y: by + rpy * ro * taper })
  }
  // River nodes: begin at the edge source, then follow the course at wide random
  // intervals (the boat's speed bonus), skipping the last stretch near Bookerport
  // and any spot sitting on top of a land node.
  const step = (cfg.minNodeDist ?? DEFAULT_SPACING) * 1.7
  const clearance = (cfg.minNodeDist ?? DEFAULT_SPACING) * 0.65
  const inBounds = (x: number, y: number) => x >= rMinX && x <= rMaxX && y >= rMinY && y <= rMaxY
  const riverNodes: MapNode[] = [addNode(zoneAt(source.x, source.y), source.x, source.y, true)]
  let acc = 0
  let nextGap = step * (0.7 + rng.float() * 0.6)
  let prev = riverLine[0]
  for (let i = 1; i < riverLine.length; i++) {
    const cur = riverLine[i]
    let seg = dist(prev.x, prev.y, cur.x, cur.y)
    while (acc + seg >= nextGap) {
      const f = (nextGap - acc) / seg
      const px = prev.x + (cur.x - prev.x) * f
      const py = prev.y + (cur.y - prev.y) * f
      const nearSink = dist(px, py, sink.x, sink.y) < step
      if (inBounds(px, py) && !nearSink && !nodes.some((nd) => dist(px, py, nd.x, nd.y) < clearance)) {
        riverNodes.push(addNode(zoneAt(px, py), px, py, true))
      }
      prev = { x: px, y: py }
      seg = dist(prev.x, prev.y, cur.x, cur.y)
      acc = 0
      nextGap = step * (0.7 + rng.float() * 0.6)
    }
    acc += seg
    prev = cur
  }
  // Water edges (special: need a boat + captain) run the river route between
  // consecutive nodes, ending at Bookerport (the sink/port). Each river node
  // also links to its closest land node, an embark point onto the river.
  for (let i = 0; i < riverNodes.length - 1; i++) link(riverNodes[i], riverNodes[i + 1], true)
  link(riverNodes[riverNodes.length - 1], bookerport, true)
  const landNodes = nodes.filter((n) => !n.river)
  for (const rn of riverNodes) {
    const nb = nearestIn(rn, landNodes.filter((n) => n.id !== rn.id), 1)[0]
    if (nb) link(rn, nb, true)
  }

  // The drawn river follows the node chain from the edge source to Bookerport
  // (the sink), so the overlay reaches both ends.
  const riverPath = [...riverNodes.map((n) => ({ x: n.x, y: n.y })), { x: bookerport.x, y: bookerport.y }]

  return { nodes, edges, regions, rivers: riverPath.length >= 2 ? [riverPath] : [] }
}

/**
 * Grow a map for `seed`. The road network is built to satisfy capital->fountain
 * >= 10 and capital->capital >= 6 by construction; the river feature is then
 * laid over the top and may create water shortcuts (by design).
 */
export function growMap(seed: string, cfg: GenConfig = {}): MapDefinition {
  return build(seed, cfg)
}
