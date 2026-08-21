// Movement: one hex step toward a target, honouring occupancy. A unit steps
// only to an in-field, unoccupied neighbour strictly closer to its target; if
// none is closer (blocked by bodies, or already as close as it can get) it
// holds. This is what makes a front line shield the units behind it. Pure.
//
// Note: this is greedy, not a full path search, so a unit boxed in by allies
// waits rather than routing around them. A BFS step is a later refinement.

import { hexDistance, hexKey, neighboursInField, type Field, type Hex } from './hex'
import type { Unit } from './types'

export function stepToward(u: Unit, target: Hex, occupied: Set<string>, field: Field): Hex {
  const current = hexDistance(u.pos, target)
  let best: Hex | null = null
  let bestDist = current
  for (const n of neighboursInField(field, u.pos)) {
    if (occupied.has(hexKey(n))) continue
    const d = hexDistance(n, target)
    if (d < bestDist) {
      best = n
      bestDist = d
    } else if (best && d === bestDist && hexKey(n) < hexKey(best)) {
      best = n
    }
  }
  return best ?? u.pos
}
