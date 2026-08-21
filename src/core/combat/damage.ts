// Damage: max(1, attacker strength-damage minus target armour), with the only
// randomness a DEX-scaled crit. Pierce ignores armour; flanking ignores part of
// it; a charge adds a flat first-contact bonus. Pure but for the injected Rng.

import type { Rng } from '../rng'
import {
  CRIT_CHANCE_CAP,
  CRIT_CHANCE_PER_DEX,
  CRIT_MULTIPLIER,
  FLANK_ARMOUR_FRACTION,
} from './constants'
import type { Unit } from './types'

/** Crit probability from DEX, clamped to [0, cap]. */
export function critChance(dex: number): number {
  return Math.min(CRIT_CHANCE_CAP, Math.max(0, dex * CRIT_CHANCE_PER_DEX))
}

export interface DamageContext {
  /** Struck from an uncovered flank or rear: ignore part of the target's armour. */
  flank?: boolean
  /** First-contact charge bonus, already computed by the caller. */
  chargeBonus?: number
}

export interface DamageResult {
  amount: number
  crit: boolean
}

export function computeDamage(
  attacker: Unit,
  target: Unit,
  rng: Rng,
  ctx: DamageContext = {},
): DamageResult {
  const strDamage = attacker.stats.str + attacker.attack.strMod
  let armour = attacker.attack.pierce ? 0 : target.armourValue
  if (ctx.flank) armour = Math.floor(armour * (1 - FLANK_ARMOUR_FRACTION))
  let amount = Math.max(1, strDamage - armour) + (ctx.chargeBonus ?? 0)
  const crit = rng.chance(critChance(attacker.stats.dex))
  if (crit) amount *= CRIT_MULTIPLIER
  return { amount, crit }
}
