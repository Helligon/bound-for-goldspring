// Domain types for the build and combat entities, mirroring the vault stat
// sheets. Pure declarations; the one behavioural rule (modifier composition)
// lives in stats.ts. Faction ids reuse the map's `Faction`, so the codebase and
// the vault share one vocabulary.

import type { Faction } from '../map/types'
import type { Stats, StatModifiers } from './stats'

/** A named unit is a hero (persistent, hard to kill); the rest are mooks. */
export type Rank = 'hero' | 'mook'

/** Weapon sub-type (the `type` field on a weapon). */
export type WeaponType =
  | 'sword'
  | 'axe'
  | 'dagger'
  | 'blunt'
  | 'polearm'
  | 'alchemical'
  | 'ranged'
  | 'other'

/** The kind of item (its top-level role). */
export type ItemKind = 'weapon' | 'armour' | 'consumable' | 'key'

/** A trait is a boon or a hindrance; the two share one shape. */
export type TraitCategory = 'boon' | 'hindrance'

/** Enemy flavours (from Events/Combat.md). */
export type EnemyType =
  | 'bandit'
  | 'faction-party'
  | 'wild-beast'
  | 'legendary-beast'
  | 'pilgrim'

/**
 * A named mechanical hook granted by a trait, item, or companion (for example
 * `"crosses-water"`, `"reduces-disease-risk"`). Kept as an open string set for
 * now; it can be narrowed to a union once the full list settles.
 */
export type Capability = string

/**
 * Origin of a combatant, weapon, or piece of gear: one of the four nations, the
 * end capital Goldspring (cosmopolitan, no set of its own), the shared Neutral
 * pool, or the Auldersmiths (a race whose smiths forge distinctive blades).
 */
export type Affiliation = Faction | 'goldspring' | 'neutral' | 'auldersmiths'

/** The battle core shared by every fighting body. Current health is runtime
 * battle state, not part of the template, so only the stat block sits here. */
export interface Combatant {
  rank: Rank
  stats: Stats
}

/** A boon or hindrance: stat modifiers and/or capability flags under one shape. */
export interface Trait {
  id: string
  name: string
  category: TraitCategory
  /** Argument for parameterised traits (e.g. Proficiency (Heavy Armour)). */
  params?: Record<string, string | null> | null
  modifiers: StatModifiers
  capabilities: Capability[]
}

/** An animal companion: has a stat block but no build pillars and no rank,
 * joined to the party via the Husbandry boon. Fights with a natural weapon
 * (absent for non-combatants like the Mule); armour is its hide value. */
export interface Companion {
  id: string
  name: string
  kind: 'companion'
  stats: Stats
  naturalWeapon?: NaturalWeapon
  armourValue: number
  capabilities: Capability[]
  upkeep: number
}

/** An enemy combatant: the shared core plus flavour and a reward on defeat. */
export interface Enemy extends Combatant {
  id: string
  name: string
  type: EnemyType
  loot: { gold: number; items: string[] }
}

/** A weapon, armour, consumable, or key item. Weapons carry `type`/`faction`;
 * other kinds may omit them. Effects are stat `modifiers` plus `capabilities`. */
export interface Item {
  id: string
  name: string
  kind: ItemKind
  type?: WeaponType
  faction?: Affiliation
  /** Stat deltas conferred while equipped (weapons contribute `str`). */
  modifiers: StatModifiers
  /** Weapons: attacks per exchange, set by weapon type. Absent for non-weapons.
   * Melee adds this to SPD, ranged and thrown add it to DEX. */
  rof?: number
  /** Charge conferred while wielding, for braced polearms. Adds to the mount's. */
  charge?: number
  /** Armour items: damage mitigation value. */
  armourValue?: number
  capabilities: Capability[]
  /** Gold price for shop buy/sell. */
  value: number
}

/** Human or animal; an animal fights with a natural weapon, not equipment. */
export type Species = 'human' | 'animal'

/** A beast's innate attack: no equipped weapon, its own rate of fire, and the
 * stat that clocks it (`spd` for a bite or claw, `dex` for a ranged spit). */
export interface NaturalWeapon {
  name: string
  rof: number
  governed: 'spd' | 'dex'
}

/** A mount: a bonus package layered onto its rider, not a separate creature.
 * While mounted the rider gains the health bonus and charge and moves at the
 * mount's speed; there is no separate mount health and no dismounting. */
export interface Mount {
  id: string
  name: string
  kind: 'mount'
  tier: 'standard' | 'legendary'
  affiliation: Affiliation
  grants: { healthBonus: number; charge: number; spd: number }
  capabilities: Capability[]
  upkeep: number
  value: number
}

/** An authored combatant template, mirroring a vault stat sheet. The combat
 * engine instantiates it into a runtime battle unit; health is derived from
 * `stats.str` (halved for a mook). Humans carry a `weapon` (and `secondary`
 * fallback); animals carry a `naturalWeapon` instead. */
export interface CombatantSheet extends Combatant {
  id: string
  name: string
  kind: 'combatant'
  species: Species
  affiliation: Affiliation
  weapon?: string
  secondary?: string | null
  naturalWeapon?: NaturalWeapon
  /** Worn-armour mitigation. */
  armourValue: number
  /** Mount id, or null. */
  mount: string | null
  capabilities: Capability[]
}

/** A member of the Captain's party. Heroes are named and carry a build; mooks
 * are expendable and may have no build. Effective stats are the base `stats`
 * plus the modifiers from `equipment` and the referenced traits. */
export interface PartyMember extends Combatant {
  id: string
  name: string
  isCaptain: boolean
  /** The three build pillars; null for mooks with no build. */
  build: { nation: Faction; race: string; profession: string } | null
  /** Trait ids. */
  boons: string[]
  hindrances: string[]
  /** Item ids in each slot. */
  equipment: { weapon: string | null; armour: string | null; trinket: string | null }
  upkeep: number
  /** Times this hero has gone down; drives the post-battle death save. */
  timesDowned: number
}

/** Shared shape of a build pillar: base stats plus the traits it grants. */
interface PillarBase {
  id: string
  name: string
  statContribution: Stats
  /** Trait ids. */
  grantsBoons: string[]
  grantsHindrances: string[]
}

/** A playable nation (build pillar), with its weapon set and legendary mount. */
export interface Nation extends PillarBase {
  kind: 'nation'
  id: Faction
  /** Item ids. */
  weaponSet: string[]
  /** Mount id, if any. */
  mount: string | null
}

/** A race build pillar. */
export interface Race extends PillarBase {
  kind: 'race'
}

/** A profession build pillar. */
export interface Profession extends PillarBase {
  kind: 'profession'
}
