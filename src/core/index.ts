// Public surface of the game core. The core is pure TypeScript with no DOM or
// React dependency, so it can be unit-tested in isolation and, later, reused
// behind a PixiJS renderer or a Capacitor build without change.

export { Rng } from './rng'
export { MAP } from './map/mapData'
export { growMap } from './map/growMap'
export type { GenConfig } from './map/growMap'
export { generateRun } from './map/generateRun'
export { createGame, neighbours, revealedNodes, canTravel, travel, edgeKey } from './game/travel'
export type { GameState, TravelCaps } from './game/travel'
export {
  createResources,
  adjust,
  applyTravelStep,
  isStarving,
  hasCollapsed,
  MORALE_MAX,
  FOOD_PER_STEP,
  STARTING_RESOURCES,
} from './game/resources'
export type { Resources } from './game/resources'
export { actionsFor, canResolve, resolveAction } from './game/encounters'
export type { EncounterAction, EncounterActionId } from './game/encounters'
export { travelStep } from './game/run'
export type { StepResult } from './game/run'
export { applyModifiers, maxHealthFor, ZERO_STATS, HEALTH_BASE, HEALTH_PER_STR } from './entities/stats'
export type { Stats, StatModifiers } from './entities/stats'
export {
  WEAPONS,
  MOUNTS,
  COMBATANTS,
  weaponById,
  mountById,
  combatantById,
  resolveBattle,
  traceBattle,
  DEFAULT_FIELD,
  allHexes,
  hexDistance,
  hexEquals,
  hexKey,
  inBounds,
} from './combat'
export type {
  Field,
  Hex,
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
} from './combat'
export type {
  Rank,
  WeaponType,
  ItemKind,
  TraitCategory,
  EnemyType,
  Capability,
  Affiliation,
  Species,
  NaturalWeapon,
  Mount,
  CombatantSheet,
  Combatant,
  Trait,
  Companion,
  Enemy,
  Item,
  PartyMember,
  Nation,
  Race,
  Profession,
} from './entities/types'
export { ZONE_LABELS, ZONE_AREA } from './map/types'
export {
  CAPITAL_RULES,
  checkCapitalRules,
  graphDistance,
  minCapitalToGoldspring,
  minCapitalPairDistance,
} from './map/distances'
export type { CapitalRules, CapitalRuleReport } from './map/distances'
export type {
  Faction,
  Zone,
  EventType,
  NodeKind,
  Terrain,
  MapNode,
  MapEdge,
  MapDefinition,
  RunNode,
  RunMap,
} from './map/types'
