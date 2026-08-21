// Target selection: the legible rule the auto-resolver runs each time a unit is
// ready to act. Nearest active enemy, ties broken deterministically, with taunt
// overriding for adjacent foes so an anchor holds the line. Pure.

import { hexDistance } from './hex'
import { MELEE_RANGE } from './constants'
import type { Unit } from './types'

/** In the fight: neither dead nor downed. */
export function isActive(u: Unit): boolean {
  return !u.dead && !u.down
}

/** Takes part in combat (the Mule and its kind do not). */
export function isCombatant(u: Unit): boolean {
  return !u.capabilities.includes('non-combatant')
}

/** The living, fighting units on the other side. */
export function activeEnemies(u: Unit, units: Unit[]): Unit[] {
  return units.filter((o) => o.side !== u.side && isActive(o) && isCombatant(o))
}

/** Deterministic preference: closer, then weaker, then lower id. */
function preferred(from: Unit, a: Unit, b: Unit): Unit {
  const da = hexDistance(from.pos, a.pos)
  const db = hexDistance(from.pos, b.pos)
  if (da !== db) return da < db ? a : b
  if (a.health !== b.health) return a.health < b.health ? a : b
  return a.id < b.id ? a : b
}

/** The enemy `u` will act against, or null if none remain. An adjacent taunter
 * captures the choice; otherwise the nearest enemy wins. */
export function chooseTarget(u: Unit, units: Unit[]): Unit | null {
  const foes = activeEnemies(u, units)
  if (foes.length === 0) return null
  const adjacentTaunters = foes.filter(
    (o) => o.capabilities.includes('taunt') && hexDistance(u.pos, o.pos) <= MELEE_RANGE,
  )
  const pool = adjacentTaunters.length > 0 ? adjacentTaunters : foes
  return pool.reduce((best, o) => preferred(u, best, o))
}
