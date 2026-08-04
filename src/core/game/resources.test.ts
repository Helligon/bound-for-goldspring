import { describe, expect, it } from 'vitest'
import {
  adjust,
  applyTravelStep,
  createResources,
  hasCollapsed,
  isStarving,
  MORALE_MAX,
  STARTING_RESOURCES,
} from './resources'

describe('resources (spine: state + sinks)', () => {
  it('starts from the documented values, overridable', () => {
    expect(createResources()).toEqual(STARTING_RESOURCES)
    expect(createResources({ gold: 999 })).toEqual({ ...STARTING_RESOURCES, gold: 999 })
  })

  it('adjust applies deltas and returns a new object (pure)', () => {
    const before = createResources({ gold: 10, food: 5, morale: 50 })
    const after = adjust(before, { gold: 5, food: -2 })
    expect(after).toEqual({ gold: 15, food: 3, morale: 50 })
    expect(before.gold).toBe(10) // untouched
    expect(after).not.toBe(before)
  })

  it('clamps morale to 0..MORALE_MAX and floors food and gold at 0', () => {
    const r = createResources({ gold: 0, food: 0, morale: MORALE_MAX })
    expect(adjust(r, { morale: 50 }).morale).toBe(MORALE_MAX) // capped
    expect(adjust(r, { morale: -999 }).morale).toBe(0) // floored
    expect(adjust(r, { food: -5 }).food).toBe(0) // floored
    expect(adjust(r, { gold: -5 }).gold).toBe(0) // floored
  })

  it('a travel step consumes food per party member (default party of one)', () => {
    const r = createResources({ food: 10, morale: 100 })
    expect(applyTravelStep(r).food).toBe(9)
    expect(applyTravelStep(r, 3).food).toBe(7)
    expect(applyTravelStep(r).morale).toBe(100) // fed: morale untouched
  })

  it('starves when food runs out: the shortfall drains morale instead', () => {
    const r = createResources({ food: 1, morale: 100 })
    const stepped = applyTravelStep(r, 3) // needs 3, has 1 -> shortfall 2
    expect(stepped.food).toBe(0)
    expect(stepped.morale).toBe(98)
  })

  it('reports starving (no food) and collapse (no morale)', () => {
    expect(isStarving(createResources({ food: 0 }))).toBe(true)
    expect(isStarving(createResources({ food: 1 }))).toBe(false)
    expect(hasCollapsed(createResources({ morale: 0 }))).toBe(true)
    expect(hasCollapsed(createResources({ morale: 1 }))).toBe(false)
  })
})
