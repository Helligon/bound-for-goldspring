// Movement: one hex step along the shortest passable path toward a target. A BFS
// distance field is grown out from the target over in-field, unoccupied hexes;
// the unit then steps to the neighbour closest to the target along that field.
// This routes around holes (water, obstacles) and around other bodies, so a
// front line still shields the back line but a unit is never permanently stuck
// when a way around exists. Pure.

import { canCross, hexKey, neighboursInField, type Field, type Hex } from './hex'
import type { Unit } from './types'

/**
 * BFS distances from `from` over passable hexes (in-field, and not occupied by
 * another unit). `passThrough` hexes (the mover's own and the target's) are
 * treated as passable so the field reaches them.
 */
function distanceField(
  from: Hex,
  field: Field,
  occupied: Set<string>,
  passThrough: Set<string>,
): Map<string, number> {
  const dist = new Map<string, number>([[hexKey(from), 0]])
  const queue: Hex[] = [from]
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head]
    const d = dist.get(hexKey(cur))! + 1
    for (const n of neighboursInField(field, cur)) {
      const k = hexKey(n)
      if (dist.has(k)) continue
      if (!canCross(field, cur, n)) continue // blocked border (river, wall)
      if (occupied.has(k) && !passThrough.has(k)) continue
      dist.set(k, d)
      queue.push(n)
    }
  }
  return dist
}

/** The hex `u` steps to when advancing toward `target`: the in-field, unoccupied
 * neighbour with the lowest path-distance to the target, ties broken
 * deterministically. If no neighbour makes progress (blocked in, or the target
 * is walled off) the unit holds. */
export function stepToward(u: Unit, target: Hex, occupied: Set<string>, field: Field): Hex {
  const passThrough = new Set([hexKey(u.pos), hexKey(target)])
  const dist = distanceField(target, field, occupied, passThrough)
  let best: Hex | null = null
  let bestDist = dist.get(hexKey(u.pos)) ?? Infinity
  for (const n of neighboursInField(field, u.pos)) {
    const k = hexKey(n)
    if (occupied.has(k)) continue // cannot step onto any occupied hex
    if (!canCross(field, u.pos, n)) continue // cannot cross a blocked border
    const d = dist.get(k)
    if (d === undefined) continue // unreachable from the target
    if (d < bestDist) {
      best = n
      bestDist = d
    } else if (best && d === bestDist && k < hexKey(best)) {
      best = n
    }
  }
  return best ?? u.pos
}
