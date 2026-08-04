// Encounter framework: turn a node's event into player actions and resolve one.
// Data-driven registry, pure and DOM-free like the rest of the core. An action's
// effect touches only Resources and returns a new pool (decoupled), and all
// maths is integer. Combat/recruit/train are non-events for now; they will be
// added as new action definitions without reworking this seam.

import type { EventType } from '../map/types'
import type { Rng } from '../rng'
import { adjust, type Resources } from './resources'

export type EncounterActionId = 'rest' | 'drink' | 'wager-dice'

export interface EncounterAction {
  id: EncounterActionId
  label: string
  /** One-line cost/effect summary for the UI. */
  summary: string
  /** True when the action needs a stake amount (wager). */
  needsStake?: boolean
}

const ACTIONS: Record<EncounterActionId, EncounterAction> = {
  rest: { id: 'rest', label: 'Rest', summary: 'Eat rations to restore morale' },
  drink: { id: 'drink', label: 'Sit and drink', summary: 'Spend 2g for morale' },
  'wager-dice': {
    id: 'wager-dice',
    label: 'Throw dice',
    summary: 'Stake gold on a 50/50 roll',
    needsStake: true,
  },
}

/** The actions a node's event offers. Empty for non-events. */
export function actionsFor(event: EventType | undefined): EncounterAction[] {
  switch (event) {
    case 'camp':
      return [ACTIONS.rest]
    case 'shop':
      return [ACTIONS.drink]
    case 'wager':
      return [ACTIONS['wager-dice']]
    case 'tavern':
      return [ACTIONS.rest, ACTIONS.drink, ACTIONS['wager-dice']]
    default:
      return []
  }
}

// placeholder balance constants (see spec) — tuned later
export const REST_FOOD = 3
export const REST_MORALE_PER_FOOD = 5
export const DRINK_COST = 2
export const DRINK_MORALE = 8

/** Whether an action can be taken with the current resources. */
export function canResolve(
  resources: Resources,
  actionId: EncounterActionId,
  stake?: number,
): boolean {
  switch (actionId) {
    case 'rest':
      return resources.food > 0
    case 'drink':
      return resources.gold >= DRINK_COST
    case 'wager-dice':
      return stake !== undefined && stake >= 1 && stake <= resources.gold
    default:
      return false
  }
}

/**
 * Apply one action, returning new resources. Throws if `canResolve` is false,
 * matching the travel contract. `rng` drives randomised actions (wager); it is
 * accepted for all actions so the signature is uniform.
 */
export function resolveAction(
  resources: Resources,
  actionId: EncounterActionId,
  rng: Rng,
  stake?: number,
): Resources {
  if (!canResolve(resources, actionId, stake)) {
    throw new Error(`cannot resolve ${actionId}`)
  }
  switch (actionId) {
    case 'rest': {
      const eaten = Math.min(resources.food, REST_FOOD)
      return adjust(resources, { food: -eaten, morale: eaten * REST_MORALE_PER_FOOD })
    }
    case 'drink':
      return adjust(resources, { gold: -DRINK_COST, morale: DRINK_MORALE })
    case 'wager-dice': {
      const s = stake ?? 0
      return rng.chance(0.5) ? adjust(resources, { gold: s }) : adjust(resources, { gold: -s })
    }
    default:
      throw new Error(`unknown action ${actionId}`)
  }
}
