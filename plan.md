# Combat and Skirmish — Build Plan

Next steps to turn the settled combat design into a playable, standalone skirmish
sim, then wire it into the run. The design is authoritative in the vault at
`Mechanics/Combat/Combat Model.md`; this plan is the implementation route.

## Where we are

- **Design: done.** Placement-driven, tick-based auto-battler on hexes. Actors are
  STR/SPD/DEX. Melee rate = SPD + weapon RoF, ranged/thrown rate = DEX + weapon RoF.
  Damage = max(1, STR − armour), crit is the only RNG. Charge is a first-contact
  bonus from mounts (and braced polearms). Flanking ignores part of armour. Heroes
  down at 0 then roll a d6 death save (threshold = timesDowned + 1); mooks die
  outright. Mounts are a bonus package on the rider (health, charge, speed), no
  dismounting.
- **Vault + code aligned on STR/SPD/DEX.** The whole vault is migrated; the combat
  content (48 weapons, 6 mounts, 22 combatants) is ingested into
  `src/core/combat/data/` and verified against the vault.
- **Engine: done.** `resolveBattle(setup, rng)` and `traceBattle` live in
  `src/core/combat/`, pure and deterministic except crit (139 tests green).
- **Sim: MVP done.** `#/skirmish` plays a fight back on a hex grid, but it
  **auto-deploys preset parties** — you can watch a fight, not play one. Making it
  actually playable is the active phase (Phase 4 below).

## Key scoping decision

The skirmish sim consumes **flat, pre-statted combatant sheets** (the vault
combatants already carry final STR/SPD/DEX, not stats built up from pillars).
So the **full build-pillar migration** (nations/races/professions →
STR/SPD/DEX, plus point-buy) is **not needed for the sim** and is deferred. The
sim needs only: combatants, weapons (with RoF), and mounts. This keeps the first
milestone small.

## Working practice

TDD the core, as per `CLAUDE.md`. Every combat rule gets a failing test first,
then the minimum code to pass. The engine stays DOM-free in `src/core/combat/`.
`npm test` for the suite; `npx vitest run src/core/combat/<file>.test.ts` for one.

---

## Phase 1 — Data and types (foundation)

Bridge the code to the new model and get the vault content into typed data.

Status: DONE, and the whole vault is now on the new model. Code migrated; all
weapon files migrated (vault↔code verified identical, 48 each side, zero drift);
factions, all 5 professions, companions, and the sight traits (Tracker, Myopia)
converted to STR/SPD/DEX (sight moved from a stat modifier to a `plus-1-sight` /
`minus-1-sight` capability). Vault swept: no residual old stat keys. 97 tests green.

Still deferred (not a schema mismatch, just not built yet): ingesting nations/
professions/companions into code data modules, and the point-buy allocation that
turns the three pillars into a character. The sim does not need them.

1. **Migrate the shared stat block.** `src/core/entities/stats.ts`:
   `Stats = { str, spd, dex }`; update `ZERO_STATS`, `applyModifiers`, and
   `stats.test.ts`. Add a derived-health helper `maxHealthFor(str)` (health is not
   a stored stat now). Move `armour`, `charge`, `sight` off the stat block:
   armour is an equipment value, charge is unit state fed by mount/weapon, sight is
   a map-layer concern.
2. **Update entity types.** `src/core/entities/types.ts`:
   - Weapon (`Item`): keep the STR modifier and any `charge` modifier (braced
     polearms), replace `attackSpeed` with `rof` derived from weapon type.
   - New `Mount` type: `{ id, name, grants: { healthBonus, charge, spd },
     capabilities, upkeep, value }`.
   - Combatant sheet type to mirror the vault: `{ id, name, species, affiliation,
     rank, stats, weapon, secondary, armourValue, mount, capabilities,
     naturalWeapon? }`. Reconcile with the existing `Combatant`/`Enemy` shapes.
3. **Weapon RoF migration in the vault.** Set each weapon's `attackSpeed` to its
   type RoF: dagger 3, one-handed 2, two-handed 1, bow 2, crossbow 1, cannon 0.5,
   thrown 1. Leave STR and charge modifiers intact. Touches every file in
   `Mechanics/Weapons/`.
4. **Ingest vault data into code.** Add `src/core/combat/data/` mirroring the vault:
   `weapons.ts`, `mounts.ts`, `combatants.ts`. Hand-transcribe for now (the vault is
   JSON-in-markdown). A small parser to generate these from the vault is a possible
   later convenience, not needed yet.

## Phase 2 — Combat engine (the meat, test-first)

Status: DONE. `resolveBattle(setup, rng): BattleResult` runs a full battle tick by
tick, deterministic except crit. All nine steps below implemented and tested (46
combat tests; 137 total green), verified with a live 3v3 smoke run. Modules:
`hex.ts`, `constants.ts`, `types.ts`, `unit.ts` (instantiation), `targeting.ts`,
`movement.ts`, `damage.ts`, `resolve.ts`, barrel `combat/index.ts`. Known
simplification: movement is greedy, not a full path search, so a unit boxed in by
allies waits rather than routing around (a BFS step is a later refinement).

`src/core/combat/`, a pure `resolveBattle(setup, rng): BattleResult`, deterministic
except crit. Build incrementally, each step behind a failing test:

1. **Hex grid.** Axial coords, distance, neighbours, an 8×6 field with two
   deployment zones. (`hex.ts`)
2. **Occupancy and movement.** One unit per hex, step toward target, body-blocking
   (cannot pass through others). This is the rule that makes placement matter.
3. **Tick loop.** Move meter fills by SPD; attack meter by SPD + RoF (melee) or
   DEX + RoF (ranged/thrown). Act when ready: attack in range, else step.
4. **Targeting.** Nearest enemy; ranged shoots nearest-in-range else advances;
   taunt overrides adjacent; deterministic tie-breaks (lowest health, then id).
5. **Damage.** max(1, STR-damage − armourValue); `pierce` ignores armour; crit
   (only RNG, DEX-driven, from the run Rng) multiplies; poison as deterministic
   damage-over-time.
6. **Charge and flanking.** Charge first-contact burst scaled by charge and hexes
   closed; flanking (hit from an uncovered side/rear) ignores part of armour.
7. **Mounts.** Apply the mount grants (health bonus, charge, move speed) to the
   unit at setup. No separate mount entity.
8. **Ranks and death.** Mook dies at 0; hero goes down, and after the battle rolls
   a d6 death save at threshold timesDowned + 1. Keep kill attribution in the
   result (needed for hero-kills and future mook promotion).
9. **Result.** Battle ends when one side has no combat-capable units. Return
   survivors, remaining health, and who-killed-whom.

## Phase 3 — Skirmish UI (thin viewport)

Status: DONE (MVP). Hash route `#/skirmish` (`Root.tsx`), `SkirmishView.tsx` renders
a hex battlefield and plays a fight back frame by frame via a new `traceBattle`
(engine records a frame per tick; 139 tests green). Preset player/enemy parties,
seed control, auto-deploy into side columns, live rosters, result banner, and
play/pause + scrub transport. Build passes (the itch bundle). Verified in-browser
by screenshot. Deferred polish: drag-to-place instead of auto-deploy; and the
end-of-playback roster shows the pre-save "down" state while the banner counts
post-save survivors (a downed player hero can survive its death save), which reads
oddly and could be reconciled.

`src/ui/`, route `/skirmish` (hash-based on static hosts). No rules in the UI.

1. Roster picker from the combatant data; place units on the deployment-zone hexes.
2. Preset enemy parties as difficulty tiers.
3. Start, then animate or step the tick resolution; show the outcome and casualties.
4. Reuse `MapView.tsx` patterns for the hex render where sensible; keep it a
   viewport over the core, not a fork.

## Phase 4 — Sim to playtest-ready (ACTIVE)

Turn the watch-only MVP into a tool you can actually play and read, then tune, then
ship. The design premise is that **placement carries the strategy**, so manual
deployment is the headline. Ordered so each step ships on its own; UI is exempt
from strict TDD, but the engine additions (the event log) are test-first.

1. **Combat log (engine + UI). DONE.** Engine emits `CombatEvent`s via an `onEvent`
   sink (mirrors `onFrame`): attack (with crit/charge/flank), poison, down, death
   (with attribution), death-save; `traceBattle` collects them into `events`, ordered
   by tick. `SkirmishView` renders a scrollable feed synced to the current tick, with
   colour-coded crit/charge/flank badges. End-state roster reconciled to post-save
   outcomes. 142 tests green; verified in-browser. Now you can see *why* a fight went
   the way it did.
2. **Drag-to-place deployment. DONE.** `SkirmishView` now has a two-phase flow: a
   deploy phase where you drag your units around the 3-column player zone (pointer
   events on the SVG, swap on drop, own-zone only), then Fight starts the battle;
   Redeploy returns to editing. Enemy auto-deploys. Verified in-browser (a real
   drag moved a unit forward). Build + 142 tests green.
3. **Custom party builder. DONE.** Deploy-phase sidebar has a `PartyEditor` per side:
   preset quick-fill chips, a removable unit list, and an affiliation-grouped Add
   control; parties are `string[]` state, capped at the field height. Fight is
   disabled until both sides have a unit. Verified in-browser (built a custom
   matchup, fought it). Build + 142 tests green.
4. **Visible feedback. DONE.** On each playback frame, an overlay draws the blows
   that landed that tick: a flash ring on the struck unit plus a floating damage
   number, colour-coded (crit red, charge amber, flank blue, poison green). The
   number holds visible so it is readable when paused; the flash is a transient
   during play. UI-only; build + 142 tests green; verified in-browser.
Extra sim controls added along the way (not numbered steps): playback speed (1×/2×)
and step-by-tick buttons; the field size now scales with the larger party (`fieldFor`:
height = partySize+1, width += area size class; manual W/H retired, party cap 8); a
crown marker on hero tokens; and an
area-battlefield system (replaced the earlier abstract ball/bell/boot/bone shapes,
which read as arbitrary). `Field` carries an optional `holes` set (removed hexes)
in `hex.ts` — the general mechanism for water and, later, obstacles (unused so far;
all current battlefields are full fields). `SkirmishView` defines battlefields tied
to the map's areas — Great Fields (grass), Ashfall (ash), Gold Sea (sand), Ironwood
Forest (jungle), Goldspring (streets) — each a size (small/medium/large -> dims) and
a terrain theme (a CSS-variable palette now, the hook for terrain modifiers later).
The sim picks one per seed (reproducible) with a header override; selecting one sets
the field size, and W/H stay tweakable.

Terrain battlefields DONE. Movement is BFS (distance field from the target over
passable hexes) so units route around barriers/bodies (fixes greedy "boxed-in"
stall). Terrain is edge- and hex-based, not hole-based: `Field` carries
`blockedEdges` (impassable borders, via `edgeKey`/`canCross`) and `slow` hexes
(double move cost, via `enterCost`). Melee cannot strike across a blocked border
(ranged fires over); entering slow terrain needs 2x the move meter (half speed).
`SkirmishView.generateTerrain`: rockfield/jungle/streets scatter **slow** hexes in
the middle band; **River Crossing** blocks the centre-boundary edges save a bridge
and a ford. Rendering draws slow hexes tinted and blocked edges as thick lines; a
**Terrain modal** (header button) explains both. Verified: river fights cross at
the gaps, slow fights resolve. 144 tests.

5. **Balance pass.** With outcomes legible, tune `constants.ts` and the stat sheets
   against feel; a matchup-matrix script to catch dominant units. Keep vault↔code
   sheet values in sync when changing numbers (change both, or re-ingest).

## Phase 5 — Ship for playtest

After Phase 4. `npm run build`, zip `dist/`, upload to itch.io as play-in-browser.
Get combat feel and the dummy numbers in front of friends; iterate on balance from
real feedback before committing the model to the whole game.

---

## Deferred (after the sim works)

- **Full build-pillar migration:** nations/races/professions `statContribution` →
  STR/SPD/DEX, plus the point-buy allocation. Needed for the main game, not the sim.
- **Main-game combat integration:** feed real party members and generated enemy
  parties into `resolveBattle`; apply results (wounds, disease, loot) to the run.
- **Design stretch (all noted in Combat Model.md):** morale and rout, terrain
  modifiers, in-fight orders, carry-weight encumbrance, out-of-ammo secondary
  switch, mook promotion, legendary-mount attacks.

## Open tuning and known gaps

- All combat numbers are **dummy**, deliberately spiky at the extremes
  (Legendary Beast STR 8, Sand Wyrm charge 6). Tune against feel once the engine runs.
- Content gaps carried from the vault: the 5 professions now carry starter stat
  sheets (so CLAUDE.md's "empty stubs" note is stale), but only one race
  (Auldersmiths) is written, and weapon RoF is uniform by type.
- Confirm charge sources: mounts **and** braced polearms both feed a unit's charge.
- Engine refinement, if fights ever stall: movement is greedy, so a unit boxed in
  by allies waits rather than pathing around. A BFS step would fix it.
