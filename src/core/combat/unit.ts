// Instantiation: turn an authored CombatantSheet into a live battle Unit,
// resolving its weapon or natural weapon into an attack profile and baking in
// the effective, derived values (health from strength plus mount, charge from
// mount plus braced weapon, move speed from the mount when ridden). Pure.

import type { CombatantSheet } from '../entities/types'
import { maxHealthFor } from '../entities/stats'
import { MOUNTS, WEAPONS } from './data'
import { MELEE_RANGE, RANGED_RANGE } from './constants'
import type { Hex } from './hex'
import type { AttackProfile, Side, Unit } from './types'

/** Resolve how a sheet attacks. Humans read their equipped weapon; animals
 * their natural weapon. A weapon that reaches (ranged type, thrown, or
 * also-ranged) is clocked by DEX at ranged reach; everything else is melee. */
export function attackProfileFor(sheet: CombatantSheet): AttackProfile {
  if (sheet.species === 'animal') {
    const nat = sheet.naturalWeapon
    if (!nat) throw new Error(`animal ${sheet.id} has no natural weapon`)
    const ranged = nat.governed === 'dex'
    return {
      range: ranged ? RANGED_RANGE : MELEE_RANGE,
      rof: nat.rof,
      governed: nat.governed,
      strMod: 0,
      pierce: sheet.capabilities.includes('pierce'),
      poison: sheet.capabilities.includes('poison'),
    }
  }

  const weapon = sheet.weapon ? WEAPONS[sheet.weapon] : undefined
  if (!weapon) throw new Error(`human ${sheet.id} has an unknown weapon ${sheet.weapon}`)
  const caps = weapon.capabilities
  const ranged =
    weapon.type === 'ranged' || caps.includes('thrown') || caps.includes('also-ranged')
  return {
    range: ranged ? RANGED_RANGE : MELEE_RANGE,
    rof: weapon.rof ?? 1,
    governed: ranged ? 'dex' : 'spd',
    strMod: weapon.modifiers.str ?? 0,
    pierce: caps.includes('pierce'),
    poison: caps.includes('poison'),
  }
}

/** Build a live unit from a sheet, on a side, at a starting hex. `battleId`
 * makes it unique even when two units share a sheet. */
export function instantiate(sheet: CombatantSheet, side: Side, pos: Hex, battleId: string): Unit {
  const mount = sheet.mount ? MOUNTS[sheet.mount] : undefined
  const weapon = sheet.weapon ? WEAPONS[sheet.weapon] : undefined

  const base = maxHealthFor(sheet.stats.str) + (mount?.grants.healthBonus ?? 0)
  const maxHealth = sheet.rank === 'mook' ? Math.max(1, Math.floor(base / 2)) : base

  const charge = (mount?.grants.charge ?? 0) + (weapon?.charge ?? 0)
  const moveSpeed = mount ? mount.grants.spd : sheet.stats.spd

  return {
    id: battleId,
    sheetId: sheet.id,
    name: sheet.name,
    side,
    rank: sheet.rank,
    pos,
    stats: { ...sheet.stats },
    armourValue: sheet.armourValue,
    charge,
    chargeSpent: charge === 0,
    moveSpeed,
    attack: attackProfileFor(sheet),
    capabilities: [...sheet.capabilities],
    maxHealth,
    health: maxHealth,
    moveMeter: 0,
    attackMeter: 0,
    hexesMoved: 0,
    poisonTicks: 0,
    down: false,
    dead: false,
    timesDowned: 0,
    survivedSave: null,
    killedBy: null,
  }
}
