// Runtime combat types: the live battle Unit (distinct from the authored
// CombatantSheet) plus the battle setup and result shapes.

import type { Capability, Rank } from '../entities/types'
import type { Stats } from '../entities/stats'
import type { CombatantSheet } from '../entities/types'
import type { Field, Hex } from './hex'

/** The two sides of a battle. */
export type Side = 'player' | 'enemy'

/** How a unit attacks, resolved once at instantiation from its weapon or its
 * natural weapon. `governed` is the stat that clocks it and takes the RoF. */
export interface AttackProfile {
  range: number
  rof: number
  governed: 'spd' | 'dex'
  /** Weapon strength modifier folded into damage (0 for a natural weapon). */
  strMod: number
  pierce: boolean
  poison: boolean
}

/** A combatant in play. Derived, effective values are baked at instantiation so
 * the tick loop reads them directly. */
export interface Unit {
  /** Unique within the battle (two units may share a sheet). */
  id: string
  sheetId: string
  name: string
  side: Side
  rank: Rank
  pos: Hex
  stats: Stats
  armourValue: number
  /** Effective charge (mount + braced weapon); spent on first melee contact. */
  charge: number
  chargeSpent: boolean
  /** Effective move speed (the mount's while mounted, else the body's SPD). */
  moveSpeed: number
  attack: AttackProfile
  capabilities: Capability[]
  maxHealth: number
  health: number
  moveMeter: number
  attackMeter: number
  /** Hexes stepped so far, for the first-contact charge bonus. */
  hexesMoved: number
  /** Ticks of poison remaining on this unit. */
  poisonTicks: number
  /** A downed hero is out of the fight but not dead; a mook never downs. */
  down: boolean
  dead: boolean
  /** Persisted across the run; drives the post-battle death save. */
  timesDowned: number
  /** Result of the post-battle death save; null until rolled / not applicable. */
  survivedSave: boolean | null
  /** Battle id of the unit that struck the finishing blow, for attribution. */
  killedBy: string | null
}

/** Per-unit result, reported for both sides so the run layer can apply wounds. */
export interface UnitOutcome {
  id: string
  sheetId: string
  name: string
  side: Side
  rank: Rank
  /** Standing at battle end (survived, and survived any death save). */
  alive: boolean
  dead: boolean
  /** Down at the moment of a player defeat, before the save resolved. */
  downed: boolean
  /** Death-save outcome for a downed player hero; null if it never applied. */
  survivedSave: boolean | null
  health: number
  timesDowned: number
  killedBy: string | null
}

/** The outcome of a resolved battle. */
export interface BattleResult {
  winner: Side | 'draw'
  ticks: number
  units: UnitOutcome[]
}

/** A lightweight snapshot of one unit at one tick, for playback. */
export interface FrameUnit {
  id: string
  name: string
  sheetId: string
  side: Side
  q: number
  r: number
  health: number
  maxHealth: number
  rank: Rank
  alive: boolean
  down: boolean
  dead: boolean
}

/** The state of the field at one tick. */
export interface BattleFrame {
  tick: number
  units: FrameUnit[]
}

/** A single thing that happened during a battle, tagged with the tick it
 * occurred on, for the combat log. */
export type CombatEvent =
  | {
      kind: 'attack'
      tick: number
      attackerId: string
      attackerName: string
      targetId: string
      targetName: string
      amount: number
      crit: boolean
      charge: boolean
      flank: boolean
    }
  | { kind: 'poison'; tick: number; unitId: string; unitName: string; amount: number }
  | { kind: 'down'; tick: number; unitId: string; unitName: string; byId: string | null }
  | { kind: 'death'; tick: number; unitId: string; unitName: string; byId: string | null }
  | {
      kind: 'save'
      tick: number
      unitId: string
      unitName: string
      roll: number
      threshold: number
      survived: boolean
    }

/** A resolved battle plus a frame per tick (frame 0 is the deployment) and the
 * ordered event log. */
export interface BattleTrace {
  result: BattleResult
  frames: BattleFrame[]
  events: CombatEvent[]
}

/** A sheet placed on a starting hex. */
export interface Placement {
  sheet: CombatantSheet
  pos: Hex
}

/** Everything needed to resolve a battle deterministically (given an Rng). */
export interface BattleSetup {
  field: Field
  player: Placement[]
  enemy: Placement[]
}
