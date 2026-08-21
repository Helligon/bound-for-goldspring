// The three primary attributes every fighting body is built from, and the two
// rules that depend only on them: modifier composition and derived health. Pure
// and integer-only, like the rest of the core.
//
// STR drives damage, health, and carry weight. SPD drives move speed and the
// melee attack rate (SPD + weapon RoF). DEX drives crit chance and the ranged
// and thrown attack rate (DEX + weapon RoF). Armour is an equipment value,
// charge is unit state fed by mounts and braced weapons, and sight is a
// map-layer concern; none of them live on this block.

/** The three primary attributes shared by party members, enemies, and beasts. */
export interface Stats {
  str: number
  spd: number
  dex: number
}

/** A partial stat delta, as carried by items, traits, and pillar templates. */
export type StatModifiers = Partial<Stats>

/** A stat block with every value at zero. */
export const ZERO_STATS: Stats = { str: 0, spd: 0, dex: 0 }

const STAT_KEYS = Object.keys(ZERO_STATS) as (keyof Stats)[]

/** Health is derived from strength, not stored: HEALTH_BASE + STR * HEALTH_PER_STR.
 * Placeholder tuning; a mook takes roughly half this in the combat engine. */
export const HEALTH_BASE = 6
export const HEALTH_PER_STR = 3

/** Derived maximum health for a body of the given strength. */
export function maxHealthFor(str: number): number {
  return HEALTH_BASE + str * HEALTH_PER_STR
}

/**
 * Effective stats = base plus the sum of every modifier. Absent modifier keys
 * count as zero. Returns a new block; never mutates its inputs.
 */
export function applyModifiers(base: Stats, mods: StatModifiers[]): Stats {
  const out = { ...base }
  for (const mod of mods) {
    for (const key of STAT_KEYS) {
      out[key] += mod[key] ?? 0
    }
  }
  return out
}
