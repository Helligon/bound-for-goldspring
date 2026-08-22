// Public surface of the combat engine. The skirmish UI and the run layer import
// from here, not from deep paths.

export { resolveBattle, traceBattle } from './resolve'
export { instantiate, attackProfileFor } from './unit'
export { chooseTarget } from './targeting'
export { computeDamage, critChance } from './damage'
export { stepToward } from './movement'
export { DEFAULT_FIELD } from './constants'
export {
  allHexes,
  canCross,
  edgeKey,
  enterCost,
  hexDistance,
  hexEquals,
  hexKey,
  inBounds,
  neighbours,
  neighboursInField,
} from './hex'
export type { Field, Hex } from './hex'
export type {
  AttackProfile,
  BattleResult,
  BattleSetup,
  BattleFrame,
  BattleTrace,
  CombatEvent,
  FrameUnit,
  Placement,
  Side,
  Unit,
  UnitOutcome,
} from './types'
export { WEAPONS, MOUNTS, COMBATANTS, weaponById, mountById, combatantById } from './data'
