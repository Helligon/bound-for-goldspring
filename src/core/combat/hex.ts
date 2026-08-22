// Hex geometry for the battlefield: axial coordinates, distance, neighbours,
// and a bounded field. Pure and integer-only. The field is a parallelogram of
// axial hexes (q in [0,width), r in [0,height)); a rectangle on screen is the
// renderer's concern (Phase 3), not the metric space the rules reason about.

/** An axial hex coordinate. */
export interface Hex {
  q: number
  r: number
}

/** A bounded battlefield, `width` hexes across and `height` deep. Terrain lives on
 * edges and hexes, not by removing hexes: `blockedEdges` are borders units cannot
 * move across (rivers, walls), keyed by `edgeKey`; `slow` hexes cost double to
 * move into (rough ground), keyed by `hexKey`. */
export interface Field {
  width: number
  height: number
  blockedEdges?: ReadonlySet<string>
  slow?: ReadonlySet<string>
}

/** A stable string key for use in sets and maps. */
export function hexKey(h: Hex): string {
  return `${h.q},${h.r}`
}

/** True when two hexes are the same cell. */
export function hexEquals(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r
}

/** Hex (graph) distance between two cells: the fewest single-step moves apart. */
export function hexDistance(a: Hex, b: Hex): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
}

/** The six axial step directions, clockwise from east. */
const DIRECTIONS: readonly Hex[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
]

/** The six hexes adjacent to `h`, ignoring field bounds. */
export function neighbours(h: Hex): Hex[] {
  return DIRECTIONS.map((d) => ({ q: h.q + d.q, r: h.r + d.r }))
}

/** True when `h` lies within the field box. */
export function inBounds(field: Field, h: Hex): boolean {
  return h.q >= 0 && h.q < field.width && h.r >= 0 && h.r < field.height
}

/** Stable, direction-independent key for the border between two adjacent hexes. */
export function edgeKey(a: Hex, b: Hex): string {
  const ka = hexKey(a)
  const kb = hexKey(b)
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
}

/** True when a unit may move across the border between adjacent `a` and `b`. */
export function canCross(field: Field, a: Hex, b: Hex): boolean {
  return !field.blockedEdges?.has(edgeKey(a, b))
}

/** Greedily keep as many candidate blocked edges (edgeKeys) as possible without
 * any hex ending up with more than `maxPerHex` of them, so no hex is walled in on
 * most of its sides. Deterministic in input order. */
export function capBlockedEdges(candidates: Iterable<string>, maxPerHex = 3): Set<string> {
  const kept = new Set<string>()
  const count = new Map<string, number>()
  for (const ek of candidates) {
    if (kept.has(ek)) continue // ignore duplicate candidates
    const bar = ek.indexOf('|')
    const ka = ek.slice(0, bar)
    const kb = ek.slice(bar + 1)
    if ((count.get(ka) ?? 0) >= maxPerHex || (count.get(kb) ?? 0) >= maxPerHex) continue
    kept.add(ek)
    count.set(ka, (count.get(ka) ?? 0) + 1)
    count.set(kb, (count.get(kb) ?? 0) + 1)
  }
  return kept
}

/** Move cost to enter `h`: double on slow terrain, otherwise one. */
export function enterCost(field: Field, h: Hex): number {
  return field.slow?.has(hexKey(h)) ? 2 : 1
}

/** Every hex of the field, each exactly once. */
export function allHexes(field: Field): Hex[] {
  const out: Hex[] = []
  for (let q = 0; q < field.width; q++) {
    for (let r = 0; r < field.height; r++) {
      if (inBounds(field, { q, r })) out.push({ q, r })
    }
  }
  return out
}

/** The neighbours of `h` that lie on the board. */
export function neighboursInField(field: Field, h: Hex): Hex[] {
  return neighbours(h).filter((n) => inBounds(field, n))
}
