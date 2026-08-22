import { describe, expect, it } from 'vitest'
import {
  allHexes,
  canCross,
  capBlockedEdges,
  edgeKey,
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

    it('caps blocked edges so no hex exceeds the limit (max 3)', () => {
      const centre = h(2, 2)
      // Offer all six of the centre hex's borders as candidates.
      const candidates = neighbours(centre).map((n) => edgeKey(centre, n))
      const kept = capBlockedEdges(candidates, 3)
      expect(kept.size).toBe(3) // only three of the six survive
      const key = hexKey(centre)
      let touching = 0
      for (const ek of kept) {
        const [a, b] = ek.split('|')
        if (a === key || b === key) touching++
      }
      expect(touching).toBe(3)
    })

    it('blocks movement across a blocked edge but keeps both hexes in play', () => {
      const a = h(2, 2)
      const b = h(3, 2)
      const f: Field = { width: 8, height: 6, blockedEdges: new Set([edgeKey(a, b)]) }
      expect(allHexes(f).length).toBe(8 * 6) // no hexes removed
      expect(inBounds(f, a)).toBe(true)
      expect(inBounds(f, b)).toBe(true)
      expect(canCross(f, a, b)).toBe(false)
      expect(canCross(f, b, a)).toBe(false) // undirected
      expect(canCross(f, a, h(2, 3))).toBe(true)
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
