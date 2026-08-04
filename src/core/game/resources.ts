// The resource spine: the run's living economy state and its sinks. Pure and
// DOM-free like the rest of the core.
//
// Faucets (gold from wager/sell, food from camp/forage, morale from wins) arrive
// with the encounter system; they will all flow through `adjust`, the single
// primitive that changes resources and enforces bounds. This slice defines the
// state and the sinks (travel drains food; starvation drains morale).
//
// NOTE: every number below is a placeholder for balancing. The mechanics are
// fixed here; the tuning comes once the loop feels right.

/** The run's spendable resources. */
export interface Resources {
  /** Currency (see the vault's `g`). No upper bound. */
  gold: number
  /** Rations. Consumed by travel; drives camp healing later. No cap yet. */
  food: number
  /** A 0..MORALE_MAX gauge. Starvation erodes it; at 0 the run is in jeopardy. */
  morale: number
}

/** Upper bound on the morale gauge. */
export const MORALE_MAX = 100

/** Food consumed per party member per travel step. */
export const FOOD_PER_STEP = 1

/** Starting resources for a fresh run (placeholder values). */
export const STARTING_RESOURCES: Resources = {
  gold: 50,
  food: 20,
  morale: MORALE_MAX,
}

const clampMorale = (m: number) => Math.max(0, Math.min(MORALE_MAX, m))
const floor0 = (n: number) => Math.max(0, n)

/** A fresh resource pool, optionally overriding some fields. */
export function createResources(overrides: Partial<Resources> = {}): Resources {
  return { ...STARTING_RESOURCES, ...overrides }
}

/**
 * Apply signed deltas to a pool, returning a new bounded pool. This is the one
 * entry point for every gain and spend, so bounds are enforced in a single
 * place: gold and food floor at 0, morale is clamped to 0..MORALE_MAX.
 */
export function adjust(res: Resources, delta: Partial<Resources>): Resources {
  return {
    gold: floor0(res.gold + (delta.gold ?? 0)),
    food: floor0(res.food + (delta.food ?? 0)),
    morale: clampMorale(res.morale + (delta.morale ?? 0)),
  }
}

/**
 * Consume the food cost of one travel step. If food cannot cover the whole
 * party, food empties and the shortfall is paid in morale (the party starves).
 */
export function applyTravelStep(res: Resources, partySize = 1): Resources {
  const cost = FOOD_PER_STEP * partySize
  const shortfall = Math.max(0, cost - res.food)
  return adjust(res, { food: -cost, morale: -shortfall })
}

/** No rations left. */
export function isStarving(res: Resources): boolean {
  return res.food <= 0
}

/** Morale spent: the run is in jeopardy (loss handling is a later slice). */
export function hasCollapsed(res: Resources): boolean {
  return res.morale <= 0
}
