// The resolver: a pure function of the setup and an Rng that plays a battle out
// tick by tick and reports the outcome. Deterministic except for DEX-scaled
// crits (which draw from the injected Rng), so the same seed replays exactly.
//
// Each tick: apply poison, accrue every active unit's meters, then act in a
// fixed order. A unit attacks if its target is in range and its attack meter is
// full, otherwise it steps closer if its move meter is full. Melee hits carry a
// first-contact charge bonus and a flank bonus when the target is being ganged.
// A mook (or any enemy) dies at 0; a player hero goes down and rolls a d6 death
// save after the battle (threshold = timesDowned + 1).

import type { Rng } from '../rng'
import { canCross, enterCost, hexDistance, hexEquals, hexKey } from './hex'
import {
  ACTION_THRESHOLD,
  CHARGE_DAMAGE_PER_HEX,
  CHARGE_MAX_HEXES,
  MAX_TICKS,
  MELEE_RANGE,
  POISON_DURATION,
  POISON_PER_TICK,
} from './constants'
import { computeDamage } from './damage'
import { stepToward } from './movement'
import { chooseTarget, isActive, isCombatant } from './targeting'
import { instantiate } from './unit'
import type {
  BattleFrame,
  BattleResult,
  BattleSetup,
  BattleTrace,
  CombatEvent,
  Side,
  Unit,
  UnitOutcome,
} from './types'

/** Sink for combat-log events; a no-op when nobody is recording. */
type Emit = (e: CombatEvent) => void

function attackRate(u: Unit): number {
  const stat = u.attack.governed === 'spd' ? u.stats.spd : u.stats.dex
  return stat + u.attack.rof
}

function sideActive(units: Unit[], side: Side): boolean {
  return units.some((u) => u.side === side && isActive(u) && isCombatant(u))
}

/** A melee target is flanked when a second enemy of it is also adjacent. */
function isFlanking(attacker: Unit, target: Unit, units: Unit[]): boolean {
  return units.some(
    (o) =>
      o.id !== attacker.id &&
      o.side === attacker.side &&
      isActive(o) &&
      hexDistance(o.pos, target.pos) <= MELEE_RANGE,
  )
}

function downOrKill(
  target: Unit,
  attackerId: string | null,
  occupied: Set<string>,
  emit: Emit,
  tick: number,
): void {
  target.killedBy = attackerId
  // Mooks and all enemies die outright; a player hero goes down for a save.
  if (target.rank === 'mook' || target.side === 'enemy') {
    target.dead = true
    emit({ kind: 'death', tick, unitId: target.id, unitName: target.name, byId: attackerId })
  } else {
    target.down = true
    target.timesDowned += 1
    emit({ kind: 'down', tick, unitId: target.id, unitName: target.name, byId: attackerId })
  }
  occupied.delete(hexKey(target.pos))
}

function resolveAttack(
  attacker: Unit,
  target: Unit,
  units: Unit[],
  occupied: Set<string>,
  rng: Rng,
  emit: Emit,
  tick: number,
): void {
  const melee = attacker.attack.range === MELEE_RANGE
  let chargeBonus = 0
  if (melee && !attacker.chargeSpent) {
    const hexes = Math.min(attacker.hexesMoved, CHARGE_MAX_HEXES)
    chargeBonus = attacker.charge * hexes * CHARGE_DAMAGE_PER_HEX
    attacker.chargeSpent = true
  }
  const flank = melee && isFlanking(attacker, target, units)
  const { amount, crit } = computeDamage(attacker, target, rng, { flank, chargeBonus })
  target.health -= amount
  emit({
    kind: 'attack',
    tick,
    attackerId: attacker.id,
    attackerName: attacker.name,
    targetId: target.id,
    targetName: target.name,
    amount,
    crit,
    charge: chargeBonus > 0,
    flank,
  })
  if (attacker.attack.poison) {
    target.poisonTicks = Math.max(target.poisonTicks, POISON_DURATION)
  }
  if (target.health <= 0) downOrKill(target, attacker.id, occupied, emit, tick)
}

function tickPoison(units: Unit[], occupied: Set<string>, emit: Emit, tick: number): void {
  for (const u of units) {
    if (!isActive(u) || u.poisonTicks <= 0) continue
    u.poisonTicks -= 1
    u.health -= POISON_PER_TICK
    emit({ kind: 'poison', tick, unitId: u.id, unitName: u.name, amount: POISON_PER_TICK })
    if (u.health <= 0) downOrKill(u, 'poison', occupied, emit, tick)
  }
}

function accrue(units: Unit[]): void {
  for (const u of units) {
    if (!isActive(u) || !isCombatant(u)) continue
    u.moveMeter += u.moveSpeed
    u.attackMeter += attackRate(u)
  }
}

function act(
  units: Unit[],
  occupied: Set<string>,
  field: BattleSetup['field'],
  rng: Rng,
  emit: Emit,
  tick: number,
): void {
  for (const u of units) {
    if (!isActive(u) || !isCombatant(u)) continue
    const target = chooseTarget(u, units)
    if (!target) continue
    const dist = hexDistance(u.pos, target.pos)
    // Melee can only strike across a passable border; ranged shoots over one.
    const canHit =
      dist <= u.attack.range && (u.attack.range > MELEE_RANGE || canCross(field, u.pos, target.pos))
    if (canHit) {
      if (u.attackMeter >= ACTION_THRESHOLD) {
        u.attackMeter -= ACTION_THRESHOLD
        resolveAttack(u, target, units, occupied, rng, emit, tick)
      }
    } else if (u.moveMeter >= ACTION_THRESHOLD) {
      const dest = stepToward(u, target.pos, occupied, field)
      if (!hexEquals(dest, u.pos)) {
        const cost = enterCost(field, dest) * ACTION_THRESHOLD
        if (u.moveMeter >= cost) {
          u.moveMeter -= cost
          occupied.delete(hexKey(u.pos))
          u.pos = dest
          occupied.add(hexKey(dest))
          u.hexesMoved += 1
        }
        // else: not enough to enter slow terrain yet; keep accruing.
      }
    }
  }
}

/** Roll the post-battle death save for every downed player hero. */
function resolveDeathSaves(units: Unit[], rng: Rng, emit: Emit, tick: number): void {
  for (const u of units) {
    if (!u.down || u.dead || u.side !== 'player') continue
    const roll = rng.int(1, 6)
    const threshold = u.timesDowned + 1
    u.survivedSave = roll >= threshold
    emit({ kind: 'save', tick, unitId: u.id, unitName: u.name, roll, threshold, survived: u.survivedSave })
    if (u.survivedSave) {
      u.down = false
      u.health = u.maxHealth
    } else {
      u.dead = true
    }
  }
}

function toOutcome(u: Unit): UnitOutcome {
  return {
    id: u.id,
    sheetId: u.sheetId,
    name: u.name,
    side: u.side,
    rank: u.rank,
    alive: isActive(u),
    dead: u.dead,
    downed: u.down,
    survivedSave: u.survivedSave,
    health: u.health,
    timesDowned: u.timesDowned,
    killedBy: u.killedBy,
  }
}

/**
 * Resolve a battle to its conclusion. `onFrame`, if given, is called once with
 * the deployment (tick 0) and again after every tick, for playback recording.
 */
export function resolveBattle(
  setup: BattleSetup,
  rng: Rng,
  onFrame?: (units: readonly Unit[], tick: number) => void,
  onEvent?: Emit,
): BattleResult {
  const emit: Emit = onEvent ?? (() => {})
  const units: Unit[] = []
  setup.player.forEach((p, i) => units.push(instantiate(p.sheet, 'player', p.pos, `p${i}`)))
  setup.enemy.forEach((p, i) => units.push(instantiate(p.sheet, 'enemy', p.pos, `e${i}`)))

  const occupied = new Set<string>(units.map((u) => hexKey(u.pos)))
  onFrame?.(units, 0)

  let ticks = 0
  while (ticks < MAX_TICKS) {
    if (!sideActive(units, 'player') || !sideActive(units, 'enemy')) break
    const t = ticks + 1
    tickPoison(units, occupied, emit, t)
    accrue(units)
    act(units, occupied, setup.field, rng, emit, t)
    ticks += 1
    onFrame?.(units, ticks)
  }

  // Winner is decided by the battle's end state, before saves (which only affect
  // how many player heroes the run keeps).
  const playerWon = sideActive(units, 'player')
  const enemyWon = sideActive(units, 'enemy')
  const winner: Side | 'draw' = playerWon && !enemyWon ? 'player' : enemyWon && !playerWon ? 'enemy' : 'draw'

  resolveDeathSaves(units, rng, emit, ticks)

  return { winner, ticks, units: units.map(toOutcome) }
}

/** Resolve a battle and capture a frame per tick plus the event log, for the UI. */
export function traceBattle(setup: BattleSetup, rng: Rng): BattleTrace {
  const frames: BattleFrame[] = []
  const events: CombatEvent[] = []
  const result = resolveBattle(
    setup,
    rng,
    (units, tick) => {
      frames.push({
        tick,
        units: units.map((u) => ({
          id: u.id,
          name: u.name,
          sheetId: u.sheetId,
          side: u.side,
          q: u.pos.q,
          r: u.pos.r,
          health: Math.max(0, u.health),
          maxHealth: u.maxHealth,
          rank: u.rank,
          alive: !u.dead && !u.down,
          down: u.down,
          dead: u.dead,
        })),
      })
    },
    (e) => events.push(e),
  )
  return { result, frames, events }
}
