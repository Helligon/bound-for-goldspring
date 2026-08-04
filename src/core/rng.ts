// Deterministic, seedable pseudo-random number generator.
//
// Roguelite runs must be reproducible: the same seed always produces the same
// map events, so bugs can be replayed and seeds can be shared. Never use
// Math.random() in the game core; take an Rng instance instead.

// xmur3: hash an arbitrary string seed into a 32-bit integer.
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return h >>> 0
  }
}

// mulberry32: fast 32-bit PRNG, good enough for game content generation.
function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Rng {
  private next: () => number

  constructor(public readonly seed: string) {
    this.next = mulberry32(xmur3(seed)())
  }

  /** Float in [0, 1). */
  float(): number {
    return this.next()
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** Pick one element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick called with empty array')
    return items[this.int(0, items.length - 1)]
  }

  /** True with the given probability (0..1). */
  chance(probability: number): boolean {
    return this.next() < probability
  }
}
