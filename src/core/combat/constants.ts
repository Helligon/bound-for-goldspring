// Tuning knobs for the combat engine, gathered so they are data, not magic
// numbers buried in logic. All placeholders, to be tuned against feel.

import type { Field } from './hex'

/** Default battlefield size. */
export const DEFAULT_FIELD: Field = { width: 8, height: 6 }

/** Reach in hexes: melee strikes an adjacent enemy; ranged reaches further. */
export const MELEE_RANGE = 1
export const RANGED_RANGE = 3

/** A unit acts when one of its meters reaches this; the meter then drops by it.
 * Attack meter fills by (governed stat + weapon RoF), move meter by move speed. */
export const ACTION_THRESHOLD = 10

/** Crit is the only randomness: chance = DEX * this, capped, for CRIT_MULTIPLIER damage. */
export const CRIT_CHANCE_PER_DEX = 0.03
export const CRIT_CHANCE_CAP = 0.6
export const CRIT_MULTIPLIER = 2

/** A struck-from-the-flank target ignores this fraction of its armour (rear: all). */
export const FLANK_ARMOUR_FRACTION = 0.5

/** Charge first-contact bonus damage per hex closed on the approach, times charge. */
export const CHARGE_DAMAGE_PER_HEX = 1
/** Hexes of approach beyond which extra charge distance stops counting. */
export const CHARGE_MAX_HEXES = 4

/** Ticks a fresh dose of poison lasts. */
export const POISON_DURATION = 3

/** Poison damage per tick applied to a poisoned unit. */
export const POISON_PER_TICK = 1

/** Safety bound so a pathological setup can never loop forever. */
export const MAX_TICKS = 1000
