// Combat data mirrored from the vault, plus id lookups. The engine and the
// skirmish UI read from here rather than from deep paths.

import type { CombatantSheet, Item, Mount } from '../../entities/types'
import { WEAPONS } from './weapons'
import { MOUNTS } from './mounts'
import { COMBATANTS } from './combatants'

export { WEAPONS } from './weapons'
export { MOUNTS } from './mounts'
export { COMBATANTS } from './combatants'

export function weaponById(id: string): Item | undefined {
  return WEAPONS[id]
}

export function mountById(id: string): Mount | undefined {
  return MOUNTS[id]
}

export function combatantById(id: string): CombatantSheet | undefined {
  return COMBATANTS.find((c) => c.id === id)
}
