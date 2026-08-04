// Run orchestration: the seam where movement (travel) meets the economy
// (resources). Keeping the two systems in their own modules but joining them
// here means a single travel step always moves and pays its cost together, so
// the UI can never apply one without the other. This is where run-level state
// (party, upkeep, ...) will grow.

import type { MapDefinition } from '../map/types'
import { applyTravelStep, type Resources } from './resources'
import { travel, type GameState, type TravelCaps } from './travel'

export interface StepResult {
  game: GameState
  resources: Resources
}

/**
 * Advance one node: move the Captain to `toId` and spend the step's food cost
 * (scaled by party size). Throws on an illegal move, before spending anything,
 * so a refused step leaves both game and resources untouched.
 */
export function travelStep(
  map: MapDefinition,
  game: GameState,
  resources: Resources,
  toId: string,
  caps: TravelCaps = {},
  partySize = 1,
): StepResult {
  const moved = travel(map, game, toId, caps) // throws if the move is illegal
  return { game: moved, resources: applyTravelStep(resources, partySize) }
}
