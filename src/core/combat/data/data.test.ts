// Referential-integrity invariants for the mirrored combat data. These catch
// transcription mistakes loudly: a combatant pointing at a weapon or mount id
// that does not exist, a human with no weapon, an animal with no natural attack,
// a weapon whose map key disagrees with its id, and so on.

import { describe, expect, it } from 'vitest'
import { COMBATANTS, MOUNTS, WEAPONS } from './index'

describe('combat data: weapons', () => {
  it('every weapon key matches its id and has a positive rate of fire', () => {
    for (const [key, w] of Object.entries(WEAPONS)) {
      expect(w.id).toBe(key)
      expect(w.kind).toBe('weapon')
      expect(w.rof).toBeGreaterThan(0)
    }
  })
})

describe('combat data: mounts', () => {
  it('every mount key matches its id and carries its grants', () => {
    for (const [key, m] of Object.entries(MOUNTS)) {
      expect(m.id).toBe(key)
      expect(m.kind).toBe('mount')
      expect(typeof m.grants.healthBonus).toBe('number')
      expect(typeof m.grants.charge).toBe('number')
      expect(typeof m.grants.spd).toBe('number')
    }
  })
})

describe('combat data: combatants', () => {
  it('has unique ids', () => {
    const ids = COMBATANTS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every combatant has a full stat block and non-negative armour', () => {
    for (const c of COMBATANTS) {
      for (const key of ['str', 'spd', 'dex'] as const) {
        expect(typeof c.stats[key]).toBe('number')
      }
      expect(c.armourValue).toBeGreaterThanOrEqual(0)
    }
  })

  it('humans carry a resolvable weapon (and secondary), animals carry a natural weapon', () => {
    for (const c of COMBATANTS) {
      if (c.species === 'human') {
        expect(c.weapon, `${c.id} weapon`).toBeDefined()
        expect(WEAPONS[c.weapon!], `${c.id} weapon ${c.weapon}`).toBeDefined()
        if (c.secondary != null) {
          expect(WEAPONS[c.secondary], `${c.id} secondary ${c.secondary}`).toBeDefined()
        }
        expect(c.naturalWeapon).toBeUndefined()
      } else {
        expect(c.naturalWeapon, `${c.id} naturalWeapon`).toBeDefined()
        expect(c.naturalWeapon!.rof).toBeGreaterThan(0)
        expect(c.weapon).toBeUndefined()
      }
    }
  })

  it('every referenced mount resolves', () => {
    for (const c of COMBATANTS) {
      if (c.mount != null) {
        expect(MOUNTS[c.mount], `${c.id} mount ${c.mount}`).toBeDefined()
      }
    }
  })
})
