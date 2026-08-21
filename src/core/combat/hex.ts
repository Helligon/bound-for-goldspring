// Hex geometry for the battlefield: axial coordinates, distance, neighbours,
// and a bounded field. Pure and integer-only. The field is a parallelogram of
// axial hexes (q in [0,width), r in [0,height)); a rectangle on screen is the
// renderer's concern (Phase 3), not the metric space the rules reason about.

/** An axial hex coordinate. */
export interface Hex {
  q: number
  r: number
}

/** A bounded battlefield, `width` hexes across and `height` deep. `holes`, if
 * given, are hexes removed from the box (water, obstacles), keyed by hexKey, so
 * rivers and terrain all use one mechanism. */
export interface Field {
  width: number
  height: number
  holes?: ReadonlySet<string>
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

/** True when `h` lies within the field box and is not a removed hole. */
export function inBounds(field: Field, h: Hex): boolean {
  if (h.q < 0 || h.q >= field.width || h.r < 0 || h.r >= field.height) return false
  return !field.holes?.has(hexKey(h))
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
