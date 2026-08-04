import { describe, expect, it } from 'vitest'
import { Rng } from '../rng'
import { createResources } from './resources'
import { actionsFor, canResolve, resolveAction } from './encounters'

describe('actionsFor', () => {
  it('offers the right actions per event', () => {
    expect(actionsFor('camp').map((a) => a.id)).toEqual(['rest'])
    expect(actionsFor('shop').map((a) => a.id)).toEqual(['drink'])
    expect(actionsFor('wager').map((a) => a.id)).toEqual(['wager-dice'])
    expect(actionsFor('tavern').map((a) => a.id)).toEqual(['rest', 'drink', 'wager-dice'])
  })

  it('offers nothing for non-events and undefined', () => {
    expect(actionsFor('combat')).toEqual([])
    expect(actionsFor('recruit')).toEqual([])
    expect(actionsFor('train')).toEqual([])
    expect(actionsFor(undefined)).toEqual([])
  })

  it('marks wager as needing a stake', () => {
    expect(actionsFor('wager')[0].needsStake).toBe(true)
    expect(actionsFor('camp')[0].needsStake).toBeFalsy()
  })
})

describe('rest', () => {
  const rng = new Rng('x') // unused by rest, present for signature parity

  it('eats up to REST_FOOD food and grants 5 morale per food eaten', () => {
    const out = resolveAction(createResources({ food: 10, morale: 50 }), 'rest', rng)
    expect(out.food).toBe(7) // ate 3
    expect(out.morale).toBe(65) // +15
  })

  it('eats only what is available when short', () => {
    const out = resolveAction(createResources({ food: 2, morale: 50 }), 'rest', rng)
    expect(out.food).toBe(0)
    expect(out.morale).toBe(60) // +10
  })

  it('is unavailable with no food, and refuses to resolve', () => {
    const empty = createResources({ food: 0 })
    expect(canResolve(empty, 'rest')).toBe(false)
    expect(() => resolveAction(empty, 'rest', rng)).toThrow()
  })

  it('does not mutate the input', () => {
    const before = createResources({ food: 10, morale: 50 })
    resolveAction(before, 'rest', rng)
    expect(before.food).toBe(10)
  })
})

describe('drink', () => {
  const rng = new Rng('x')

  it('spends 2 gold for 8 morale', () => {
    const out = resolveAction(createResources({ gold: 10, morale: 50 }), 'drink', rng)
    expect(out.gold).toBe(8)
    expect(out.morale).toBe(58)
  })

  it('is unavailable below the cost, and refuses to resolve', () => {
    const broke = createResources({ gold: 1 })
    expect(canResolve(broke, 'drink')).toBe(false)
    expect(() => resolveAction(broke, 'drink', rng)).toThrow()
  })
})

describe('wager-dice', () => {
  // Rng is deterministic per seed; pick seeds that win/lose the first roll.
  // Find them empirically in Step 3 if these differ on your Rng.
  const winSeed = 'wager-win'
  const loseSeed = 'wager-lose'

  it('validates the stake against gold', () => {
    const r = createResources({ gold: 5 })
    expect(canResolve(r, 'wager-dice', 0)).toBe(false)
    expect(canResolve(r, 'wager-dice', 6)).toBe(false)
    expect(canResolve(r, 'wager-dice', 5)).toBe(true)
    expect(canResolve(r, 'wager-dice')).toBe(false) // no stake
  })

  it('wins add the stake, losses subtract it', () => {
    const r = createResources({ gold: 10 })
    const win = resolveAction(r, 'wager-dice', new Rng(winSeed), 4)
    const lose = resolveAction(r, 'wager-dice', new Rng(loseSeed), 4)
    // Exactly one of the two outcomes per seed; assert both directions exist.
    expect(new Set([win.gold, lose.gold])).toEqual(new Set([14, 6]))
  })

  it('is deterministic: same seed + stake -> same result', () => {
    const r = createResources({ gold: 10 })
    const a = resolveAction(r, 'wager-dice', new Rng('z'), 3)
    const b = resolveAction(r, 'wager-dice', new Rng('z'), 3)
    expect(a).toEqual(b)
  })
})
