import { describe, expect, it } from 'vitest'
import { Rng } from './rng'

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng('hello')
    const b = new Rng('hello')
    const seqA = Array.from({ length: 5 }, () => a.float())
    const seqB = Array.from({ length: 5 }, () => b.float())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = new Rng('seed-one')
    const b = new Rng('seed-two')
    expect(a.float()).not.toEqual(b.float())
  })

  it('exposes the seed it was constructed with', () => {
    expect(new Rng('abc').seed).toBe('abc')
  })

  describe('float', () => {
    it('stays within [0, 1)', () => {
      const rng = new Rng('floats')
      for (let i = 0; i < 1000; i++) {
        const n = rng.float()
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThan(1)
      }
    })
  })

  describe('int', () => {
    it('stays within the inclusive range', () => {
      const rng = new Rng('range')
      for (let i = 0; i < 1000; i++) {
        const n = rng.int(3, 7)
        expect(n).toBeGreaterThanOrEqual(3)
        expect(n).toBeLessThanOrEqual(7)
      }
    })

    it('returns the value itself when min === max', () => {
      const rng = new Rng('single')
      expect(rng.int(5, 5)).toBe(5)
    })

    it('eventually hits both bounds of the range', () => {
      const rng = new Rng('coverage')
      const seen = new Set<number>()
      for (let i = 0; i < 500; i++) seen.add(rng.int(0, 1))
      expect(seen).toEqual(new Set([0, 1]))
    })
  })

  describe('pick', () => {
    it('returns an element from the array', () => {
      const rng = new Rng('pick')
      const items = ['a', 'b', 'c'] as const
      for (let i = 0; i < 100; i++) {
        expect(items).toContain(rng.pick(items))
      }
    })

    it('throws on an empty array', () => {
      const rng = new Rng('x')
      expect(() => rng.pick([])).toThrow()
    })
  })

  describe('chance', () => {
    it('is always false at probability 0 and always true at 1', () => {
      const rng = new Rng('chance')
      for (let i = 0; i < 100; i++) {
        expect(rng.chance(0)).toBe(false)
        expect(rng.chance(1)).toBe(true)
      }
    })

    it('is deterministic for a given seed', () => {
      const a = new Rng('c')
      const b = new Rng('c')
      const seqA = Array.from({ length: 10 }, () => a.chance(0.5))
      const seqB = Array.from({ length: 10 }, () => b.chance(0.5))
      expect(seqA).toEqual(seqB)
    })
  })
})
