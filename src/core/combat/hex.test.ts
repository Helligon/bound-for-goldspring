import { describe, expect, it } from 'vitest'
import {
  allHexes,
  hexDistance,
  hexEquals,
  hexKey,
  inBounds,
  neighbours,
  neighboursInField,
  type Field,
  type Hex,
} from './hex'

const h = (q: number, r: number): Hex => ({ q, r })

describe('hex geometry', () => {
  describe('distance', () => {
    it('is zero to itself', () => {
      expect(hexDistance(h(0, 0), h(0, 0))).toBe(0)
    })

    it('is one to each immediate neighbour', () => {
      for (const n of neighbours(h(0, 0))) {
        expect(hexDistance(h(0, 0), n)).toBe(1)
      }
    })

    it('measures multi-hop distances', () => {
      expect(hexDistance(h(0, 0), h(2, 0))).toBe(2)
      expect(hexDistance(h(0, 0), h(-1, -1))).toBe(2)
      expect(hexDistance(h(0, 0), h(3, -1))).toBe(3)
    })

    it('is symmetric', () => {
      expect(hexDistance(h(1, 2), h(-2, 3))).toBe(hexDistance(h(-2, 3), h(1, 2)))
    })
  })

  describe('neighbours', () => {
    it('returns exactly six, all distinct and all adjacent', () => {
      const ns = neighbours(h(4, 3))
      expect(ns).toHaveLength(6)
      expect(new Set(ns.map(hexKey)).size).toBe(6)
      for (const n of ns) expect(hexDistance(h(4, 3), n)).toBe(1)
    })
  })

  describe('key and equality', () => {
    it('keys equal hexes identically and distinct hexes differently', () => {
      expect(hexKey(h(1, 2))).toBe(hexKey(h(1, 2)))
      expect(hexKey(h(1, 2))).not.toBe(hexKey(h(2, 1)))
      expect(hexEquals(h(1, 2), h(1, 2))).toBe(true)
      expect(hexEquals(h(1, 2), h(2, 1))).toBe(false)
    })
  })

  describe('field bounds', () => {
    const field: Field = { width: 8, height: 6 }

    it('accepts hexes inside and rejects those outside', () => {
      expect(inBounds(field, h(0, 0))).toBe(true)
      expect(inBounds(field, h(7, 5))).toBe(true)
      expect(inBounds(field, h(-1, 0))).toBe(false)
      expect(inBounds(field, h(8, 0))).toBe(false)
      expect(inBounds(field, h(0, 6))).toBe(false)
    })

    it('enumerates every hex once', () => {
      const all = allHexes(field)
      expect(all).toHaveLength(8 * 6)
      expect(new Set(all.map(hexKey)).size).toBe(8 * 6)
      for (const hex of all) expect(inBounds(field, hex)).toBe(true)
    })

    it('removes holes from the field', () => {
      const holes = new Set([hexKey(h(2, 1)), hexKey(h(5, 3))])
      const holed: Field = { width: 8, height: 6, holes }
      expect(allHexes(holed).length).toBe(8 * 6 - 2)
      expect(inBounds(holed, h(2, 1))).toBe(false)
      expect(inBounds(holed, h(5, 3))).toBe(false)
      expect(inBounds(holed, h(3, 3))).toBe(true)
    })

    it('clips neighbours at the edge of the field', () => {
      // From the corner only two of six neighbours are on the board.
      const corner = neighboursInField(field, h(0, 0))
      expect(corner).toHaveLength(2)
      for (const n of corner) expect(inBounds(field, n)).toBe(true)
      // An interior hex keeps all six.
      expect(neighboursInField(field, h(4, 3))).toHaveLength(6)
    })
  })
})
