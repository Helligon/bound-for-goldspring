// The shared combatant stat block and the one rule every entity depends on:
// an effective stat is its base plus the sum of every modifier applied to it
// (from equipment, traits, build pillars). Pure and integer-only, like the rest
// of the core.

/** The battle-relevant stats shared by party members, enemies, and companions. */
export interface Stats {
  strength: number
  armour: number
  attackSpeed: number
  charge: number
  sight: number
  maxHealth: number
}

/** A partial stat delta, as carried by items, traits, and pillar templates. */
export type StatModifiers = Partial<Stats>

/** A stat block with every value at zero. */
export const ZERO_STATS: Stats = {
  strength: 0,
  armour: 0,
  attackSpeed: 0,
  charge: 0,
  sight: 0,
  maxHealth: 0,
}

const STAT_KEYS = Object.keys(ZERO_STATS) as (keyof Stats)[]

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
