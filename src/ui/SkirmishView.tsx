import { useEffect, useMemo, useRef, useState } from 'react'
import { allHexes, combatantById, COMBATANTS, hexKey, inBounds, traceBattle, Rng } from '../core'
import { capBlockedEdges, edgeKey, neighboursInField } from '../core/combat'
import type { BattleSetup, CombatEvent, Field, FrameUnit, Hex, Placement, Side } from '../core'

// Events that land damage this tick, drawn as floating numbers over the field.
type HitEvent = Extract<CombatEvent, { kind: 'attack' } | { kind: 'poison' }>

// The standalone skirmish sim: a viewport over the combat core. It holds no
// rules. Two phases: deploy (build both parties, then drag your units around
// your zone) and battle (watch traceBattle play the fight out, with a log).

interface Preset {
  label: string
  party: string[]
}

// Quick-fill parties. Either side can load any of these, then edit freely.
const PRESETS: Record<string, Preset> = {
  bandits: { label: 'Bandits', party: ['neutral-sellsword', 'neutral-bandit', 'neutral-bandit', 'neutral-crossbowman'] },
  beasts: { label: 'Wild beasts', party: ['neutral-legendary-beast', 'neutral-wolf', 'neutral-wolf', 'neutral-boar'] },
  masked: { label: 'Masked Men', party: ['masked-boar-rider', 'masked-fury-berserker', 'masked-fearmonger', 'masked-fearmonger'] },
  rain: { label: 'Rain Tribe', party: ['rain-bond-beast', 'rain-spear-warden', 'rain-blowgun-hunter', 'rain-blowgun-hunter'] },
  ordas: { label: 'Crimson Ordas', party: ['ordas-veil-drunk-charger', 'ordas-blade-dancer', 'ordas-mounted-archer', 'ordas-mounted-archer'] },
  bookers: { label: 'Bookers', party: ['bookers-cinder-adept', 'bookers-hired-blade', 'bookers-powder-clerk', 'bookers-powder-clerk'] },
  goldspring: { label: 'Goldspring', party: ['goldspring-gilded-executioner', 'goldspring-fountain-warden', 'goldspring-ash-sentinel', 'goldspring-powder-marshal'] },
}

// Roster grouping for the add-unit control, in display order.
const AFFILIATIONS: { id: string; label: string }[] = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'bookers-guild', label: 'Bookers Guild' },
  { id: 'masked-men', label: 'Masked Men' },
  { id: 'rain-tribe', label: 'Rain Tribe' },
  { id: 'the-crimson-ordas', label: 'The Crimson Ordas' },
  { id: 'goldspring', label: 'Goldspring' },
]

const HEX = 30
const SQRT3 = Math.sqrt(3)
const FRAME_MS = 280 // base playback duration per frame, at 1x
const SPEEDS = [1, 2] as const
const MAX_DEPLOY_COLS = 3 // deployment-zone depth per side, clamped to field width

// Battlefields tied to the areas of the wider map: each sets a size and a terrain
// theme (its palette now, the hook for terrain modifiers later). Most are full
// fields; structural battlefields (River Crossing) come in a later pass.
type Size = 'small' | 'medium' | 'large'
type Theme = 'grass' | 'ash' | 'sand' | 'jungle' | 'streets'
type Terrain = 'field' | 'rockfield' | 'jungle' | 'streets' | 'river'
type TerrainKind = 'rock' | 'tree' | 'building' | 'water' | 'bridge' | 'ford'
interface Battlefield {
  id: string
  label: string
  size: Size
  theme: Theme
  terrain: Terrain
}

const BATTLEFIELDS: Battlefield[] = [
  { id: 'great-fields', label: 'Great Fields', size: 'large', theme: 'grass', terrain: 'field' },
  { id: 'ashfall', label: 'Ashfall', size: 'large', theme: 'ash', terrain: 'rockfield' },
  { id: 'gold-sea', label: 'The Gold Sea', size: 'large', theme: 'sand', terrain: 'field' },
  { id: 'ironwood', label: 'Ironwood Forest', size: 'medium', theme: 'jungle', terrain: 'jungle' },
  { id: 'goldspring', label: 'Goldspring', size: 'medium', theme: 'streets', terrain: 'streets' },
  { id: 'river-crossing', label: 'River Crossing', size: 'medium', theme: 'grass', terrain: 'river' },
]

/** The battlefield for a seed: reproducible, so the same seed replays it. */
function battlefieldForSeed(seed: string): Battlefield {
  return BATTLEFIELDS[new Rng(`field:${seed}`).int(0, BATTLEFIELDS.length - 1)]
}

/**
 * The terrain for a battlefield: `holes` are impassable hexes (removed from the
 * field), `kinds` styles every terrain hex (including the river's playable bridge
 * and ford). Obstacles sit only in the middle band, so both deployment zones stay
 * clear. Deterministic from the seed.
 */
function generateTerrain(
  terrain: Terrain,
  width: number,
  height: number,
  cols: number,
  rng: Rng,
): { blockedEdges: Set<string>; slow: Set<string>; kinds: Map<string, TerrainKind> } {
  const blockedEdges = new Set<string>()
  const slow = new Set<string>()
  const kinds = new Map<string, TerrainKind>()
  const key = (q: number, r: number) => `${q},${r}`
  const box: Field = { width, height }
  const lo = cols
  const hi = width - cols // middle band [lo, hi): between the deployment zones
  const candidates: string[] = []

  // Rough, slow ground for the rough battlefields (deployment zones stay clear).
  if (terrain === 'rockfield' || terrain === 'jungle' || terrain === 'streets') {
    const kind: TerrainKind = terrain === 'rockfield' ? 'rock' : terrain === 'jungle' ? 'tree' : 'building'
    const density = terrain === 'streets' ? 0.3 : terrain === 'jungle' ? 0.28 : 0.22
    for (let q = lo; q < hi; q++) {
      for (let r = 0; r < height; r++) {
        if (rng.chance(density)) {
          slow.add(key(q, r))
          kinds.set(key(q, r), kind)
        }
      }
    }
  }

  // River: an impassable line down the centre boundary, save a bridge and a ford.
  if (terrain === 'river') {
    const c = Math.floor(width / 2) - 1
    const crossings = [Math.floor(height / 3), Math.floor((2 * height) / 3)]
    const open = new Set(crossings.map((r) => edgeKey({ q: c, r }, { q: c + 1, r })))
    for (let r = 0; r < height; r++) {
      for (const b of [{ q: c + 1, r }, { q: c + 1, r: r - 1 }]) {
        if (b.r < 0 || b.r >= height) continue
        const ek = edgeKey({ q: c, r }, b)
        if (!open.has(ek)) candidates.push(ek)
      }
    }
    crossings.forEach((r, i) => {
      const kind: TerrainKind = i === 0 ? 'bridge' : 'ford'
      kinds.set(key(c, r), kind)
      kinds.set(key(c + 1, r), kind)
    })
  }

  // Every map gets a few scattered impassable edges (walls, ditches) in the middle.
  if (terrain !== 'river' && hi > lo) {
    const scatter = terrain === 'field' ? 3 : 4
    for (let i = 0; i < scatter; i++) {
      const a = { q: lo + rng.int(0, hi - lo - 1), r: rng.int(0, height - 1) }
      const ns = neighboursInField(box, a)
      if (ns.length) candidates.push(edgeKey(a, ns[rng.int(0, ns.length - 1)]))
    }
  }

  // Cap so no hex is walled on more than three of its sides.
  for (const ek of capBlockedEdges(candidates, 3)) blockedEdges.add(ek)
  return { blockedEdges, slow, kinds }
}

const MAX_PARTY = 8 // party-size cap; the field grows to fit the larger party

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
const deployColsFor = (field: Field) => Math.max(1, Math.min(MAX_DEPLOY_COLS, Math.floor(field.width / 2)))

/** Field size grows with the larger party; the area's size class widens it. */
function fieldFor(bf: Battlefield, partySize: number): { width: number; height: number } {
  const height = clamp(Math.max(partySize, 4) + 1, 5, 12)
  const extra = bf.size === 'large' ? 7 : bf.size === 'medium' ? 5 : 3
  return { width: clamp(height + extra, 7, 16), height }
}

const INITIAL_FIELD: Field = fieldFor(battlefieldForSeed('skirmish-1'), 4)

function hexToPixel(q: number, r: number): { x: number; y: number } {
  return { x: HEX * SQRT3 * (q + r / 2), y: HEX * 1.5 * r }
}

function hexCorners(cx: number, cy: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30)
    pts.push(`${(cx + HEX * Math.cos(a)).toFixed(2)},${(cy + HEX * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// A small crown drawn above hero tokens, so heroes read differently from mooks.
const CROWN = <path className="unit__crown" d="M -7 -19 L -7 -26 L -3 -21 L 0 -29 L 3 -21 L 7 -26 L 7 -19 Z" />
const isHero = (sheetId: string) => combatantById(sheetId)?.rank === 'hero'

/** A little hexagon swatch that reuses the map's terrain classes, so the modal's
 * colours match exactly what is on screen for the current battlefield. */
function HexSwatch({ theme, kind, edge }: { theme: Theme; kind?: TerrainKind; edge?: boolean }) {
  const s = 15
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30)
    return `${(18 + s * Math.cos(a)).toFixed(1)},${(18 + s * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <svg className={`swatch-hex theme-${theme}`} viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
      <polygon className={`hex-cell${kind ? ` hex-terrain--${kind}` : ''}`} points={pts} />
      {edge && <line x1="18" y1="4" x2="18" y2="32" stroke="#111111" strokeWidth="5" strokeLinecap="round" />}
    </svg>
  )
}

interface LegendEntry {
  title: string
  desc: string
  kind?: TerrainKind
  edge?: boolean
}

/** The terrain legend for the active battlefield, so the modal only shows what is
 * actually on the current map. */
function legendFor(bf: Battlefield): LegendEntry[] {
  switch (bf.terrain) {
    case 'field':
      return [{ title: 'Open ground', desc: 'no terrain modifiers — units move freely.' }]
    case 'rockfield':
      return [{ title: 'Rocky ground', desc: 'rough: costs double to move into (half speed).', kind: 'rock' }]
    case 'jungle':
      return [{ title: 'Dense jungle', desc: 'rough: costs double to move into (half speed).', kind: 'tree' }]
    case 'streets':
      return [{ title: 'Congested streets', desc: 'rough: costs double to move into (half speed).', kind: 'building' }]
    case 'river':
      return [
        { title: 'Bridge', desc: 'a crossing over the river.', kind: 'bridge' },
        { title: 'Ford', desc: 'a shallow crossing.', kind: 'ford' },
      ]
  }
}

interface PlayerUnit {
  instanceId: string
  sheetId: string
  name: string
}

/** Instance list for a party (stable ids by index, so duplicates are distinct). */
function partyToUnits(party: string[]): PlayerUnit[] {
  return party.map((sheetId, i) => ({
    instanceId: `${sheetId}#${i}`,
    sheetId,
    name: combatantById(sheetId)!.name,
  }))
}

/** The valid hexes of a side's deployment zone, ordered for filling: the player's
 * left columns front-to-back, the enemy's right columns from the edge inward. */
function zoneCells(field: Field, side: Side, cols: number): Hex[] {
  const out: Hex[] = []
  const qs =
    side === 'player'
      ? Array.from({ length: cols }, (_, i) => i)
      : Array.from({ length: cols }, (_, i) => field.width - 1 - i)
  for (const q of qs) {
    for (let r = 0; r < field.height; r++) {
      if (inBounds(field, { q, r })) out.push({ q, r })
    }
  }
  return out
}

/** Deploy a party onto the first valid hexes of its zone. */
function fillZone(party: string[], field: Field, side: Side, cols: number): Placement[] {
  const cells = zoneCells(field, side, cols)
  return party.map((id, i) => ({
    sheet: combatantById(id)!,
    pos: cells[Math.min(i, cells.length - 1)] ?? { q: 0, r: 0 },
  }))
}

/** Starting layout for the player: the first valid hexes of the left zone. */
function defaultPlacement(units: PlayerUnit[], field: Field, cols: number): Record<string, Hex> {
  const cells = zoneCells(field, 'player', cols)
  const out: Record<string, Hex> = {}
  units.forEach((u, i) => {
    out[u.instanceId] = cells[Math.min(i, cells.length - 1)] ?? { q: 0, r: 0 }
  })
  return out
}

/** A party-editing panel for one side (deploy phase). */
function PartyEditor({
  title,
  party,
  max,
  onAdd,
  onRemove,
  onPreset,
}: {
  title: string
  party: string[]
  max: number
  onAdd: (sheetId: string) => void
  onRemove: (index: number) => void
  onPreset: (key: string) => void
}) {
  const [sel, setSel] = useState(COMBATANTS[0].id)
  return (
    <div className="party-editor">
      <h3>
        {title} <span className="hint">{party.length}/{max}</span>
      </h3>
      <div className="party-editor__presets">
        {Object.entries(PRESETS).map(([k, p]) => (
          <button key={k} className="btn" onClick={() => onPreset(k)}>
            {p.label}
          </button>
        ))}
      </div>
      <ul className="party-editor__list">
        {party.length === 0 && <li className="hint">empty — add units or load a preset</li>}
        {party.map((id, i) => (
          <li key={i}>
            <span>{combatantById(id)!.name}</span>
            <button className="btn btn--x" aria-label={`Remove ${combatantById(id)!.name}`} onClick={() => onRemove(i)}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="party-editor__add">
        <select value={sel} onChange={(e) => setSel(e.target.value)}>
          {AFFILIATIONS.map((a) => (
            <optgroup key={a.id} label={a.label}>
              {COMBATANTS.filter((c) => c.affiliation === a.id).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button className="btn" disabled={party.length >= max} onClick={() => onAdd(sel)}>
          Add
        </button>
      </div>
    </div>
  )
}

/** One combat-log line for an event. */
function LogLine({ e }: { e: CombatEvent }) {
  const t = <span className="log__tick">t{e.tick}</span>
  switch (e.kind) {
    case 'attack':
      return (
        <div className="log__line">
          {t} {e.attackerName} → {e.targetName} <strong>{e.amount}</strong>
          {e.crit && <span className="badge badge--crit">crit</span>}
          {e.charge && <span className="badge badge--charge">charge</span>}
          {e.flank && <span className="badge badge--flank">flank</span>}
        </div>
      )
    case 'poison':
      return (
        <div className="log__line">
          {t} {e.unitName} poisoned <strong>−{e.amount}</strong>
        </div>
      )
    case 'down':
      return (
        <div className="log__line log__line--down">
          {t} {e.unitName} is down
        </div>
      )
    case 'death':
      return (
        <div className="log__line log__line--death">
          {t} {e.unitName} dies
        </div>
      )
    case 'save':
      return (
        <div className="log__line log__line--save">
          {t} {e.unitName} save {e.roll}≥{e.threshold} {e.survived ? '✓ steadies' : '✗ dies'}
        </div>
      )
  }
}

export function SkirmishView() {
  const [field, setField] = useState<Field>(INITIAL_FIELD)
  const [battlefieldMode, setBattlefieldMode] = useState<'auto' | string>('auto')
  const [playerParty, setPlayerParty] = useState<string[]>(() => [...PRESETS.masked.party])
  const [enemyParty, setEnemyParty] = useState<string[]>(() => [...PRESETS.bandits.party])
  const [seed, setSeed] = useState('skirmish-1')
  const [phase, setPhase] = useState<'deploy' | 'battle'>('deploy')
  const [placement, setPlacement] = useState<Record<string, Hex>>(() =>
    defaultPlacement(partyToUnits(PRESETS.masked.party), INITIAL_FIELD, deployColsFor(INITIAL_FIELD)),
  )
  const [tick, setTick] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [dragging, setDragging] = useState<string | null>(null)
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null)
  const [showTerrain, setShowTerrain] = useState(false)

  const svgRef = useRef<SVGSVGElement>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // The active battlefield: the seed's by default, or a manual override. Picking
  // one sets the field to its size; W/H can then be tweaked freely.
  const activeBattlefield =
    battlefieldMode === 'auto'
      ? battlefieldForSeed(seed)
      : BATTLEFIELDS.find((b) => b.id === battlefieldMode) ?? battlefieldForSeed(seed)
  const partySize = Math.max(playerParty.length, enemyParty.length, 1)
  useEffect(() => {
    const dims = fieldFor(activeBattlefield, partySize)
    setField((f) => (f.width === dims.width && f.height === dims.height ? f : { ...f, ...dims }))
  }, [activeBattlefield.id, partySize])

  const playerUnits = useMemo(() => partyToUnits(playerParty), [playerParty])
  const deployCols = useMemo(() => deployColsFor(field), [field])
  // Terrain (obstacles/water) for the active battlefield, and the field with those
  // hexes removed as holes. Geometry runs on `battleField`; rendering also draws
  // the terrain hexes (via `boxHexes`), which are removed from play.
  const terrain = useMemo(
    () =>
      generateTerrain(
        activeBattlefield.terrain,
        field.width,
        field.height,
        deployCols,
        new Rng(`terrain:${seed}:${activeBattlefield.id}`),
      ),
    [activeBattlefield.terrain, activeBattlefield.id, field.width, field.height, deployCols, seed],
  )
  const battleField: Field = useMemo(
    () => ({
      width: field.width,
      height: field.height,
      blockedEdges: terrain.blockedEdges,
      slow: terrain.slow,
    }),
    [field.width, field.height, terrain],
  )
  const hexes = useMemo(() => allHexes(battleField), [battleField])
  const boxHexes = useMemo(() => {
    const out: Hex[] = []
    for (let q = 0; q < field.width; q++) for (let r = 0; r < field.height; r++) out.push({ q, r })
    return out
  }, [field.width, field.height])
  const maxParty = MAX_PARTY // the field auto-sizes to fit, so the cap is fixed

  // Editing the player party (or the field) resets the layout and returns to
  // deploy; editing the enemy party just returns to deploy.
  useEffect(() => {
    setPlacement(defaultPlacement(playerUnits, battleField, deployCols))
    setPhase('deploy')
    setTick(0)
  }, [playerUnits, battleField, deployCols])
  useEffect(() => {
    setPhase('deploy')
    setTick(0)
  }, [enemyParty])

  const enemyPlacements = useMemo(
    () => fillZone(enemyParty, battleField, 'enemy', deployCols),
    [enemyParty, battleField, deployCols],
  )

  const setup: BattleSetup = useMemo(
    () => ({
      field: battleField,
      player: playerUnits.map((u) => ({
        sheet: combatantById(u.sheetId)!,
        pos: placement[u.instanceId] ?? { q: 0, r: 0 },
      })),
      enemy: enemyPlacements,
    }),
    [playerUnits, placement, enemyPlacements, battleField],
  )

  const trace = useMemo(
    () => (phase === 'battle' ? traceBattle(setup, new Rng(seed)) : null),
    [phase, setup, seed],
  )

  useEffect(() => {
    if (!trace) return
    setTick(0)
    setPlaying(true)
  }, [trace])

  useEffect(() => {
    if (!trace || !playing) return
    if (tick >= trace.frames.length - 1) {
      setPlaying(false)
      return
    }
    const id = setTimeout(() => setTick((t) => Math.min(trace.frames.length - 1, t + 1)), FRAME_MS / speed)
    return () => clearTimeout(id)
  }, [trace, playing, tick, speed])

  const frame = trace ? trace.frames[Math.min(tick, trace.frames.length - 1)] : null
  const atEnd = trace ? tick >= trace.frames.length - 1 : false

  // The blows that landed on the frame currently shown, for the hit overlay.
  const hitEvents: HitEvent[] =
    trace && frame
      ? trace.events.filter(
          (e): e is HitEvent => e.tick === frame.tick && (e.kind === 'attack' || e.kind === 'poison'),
        )
      : []

  const shownEvents = trace ? trace.events.filter((e) => e.tick <= (frame?.tick ?? 0)) : []
  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [tick, trace])

  const outcomeById = useMemo(() => new Map((trace?.result.units ?? []).map((u) => [u.id, u])), [trace])
  const statusOf = (u: FrameUnit): 'dead' | 'down' | 'alive' => {
    if (atEnd) {
      const o = outcomeById.get(u.id)
      if (o) return o.dead ? 'dead' : o.downed ? 'down' : 'alive'
    }
    return u.dead ? 'dead' : u.down ? 'down' : 'alive'
  }
  const healthOf = (u: FrameUnit): number =>
    atEnd && outcomeById.get(u.id) ? Math.max(0, outcomeById.get(u.id)!.health) : u.health

  // --- Drag-to-place (deploy phase only) ---
  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }
  const hexAt = (x: number, y: number): Hex | null => {
    let best: Hex | null = null
    let bd = Infinity
    for (const h of hexes) {
      const c = hexToPixel(h.q, h.r)
      const d = Math.hypot(c.x - x, c.y - y)
      if (d < bd) {
        bd = d
        best = h
      }
    }
    return bd <= HEX ? best : null
  }
  const onTokenDown = (e: React.PointerEvent, instanceId: string) => {
    if (phase !== 'deploy') return
    e.stopPropagation()
    try {
      svgRef.current?.setPointerCapture(e.pointerId)
    } catch {
      // Non-capturable pointer (e.g. synthetic); dragging still works over the svg.
    }
    setDragging(instanceId)
    const p = toSvg(e.clientX, e.clientY)
    setGhost({ x: p.x, y: p.y })
  }
  const onSvgMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const p = toSvg(e.clientX, e.clientY)
    setGhost({ x: p.x, y: p.y })
  }
  const onSvgUp = (e: React.PointerEvent) => {
    if (!dragging) return
    const p = toSvg(e.clientX, e.clientY)
    const h = hexAt(p.x, p.y)
    if (h && inBounds(battleField, h) && h.q < deployCols) {
      setPlacement((prev) => {
        const next = { ...prev }
        const occupant = Object.keys(next).find((k) => k !== dragging && next[k].q === h.q && next[k].r === h.r)
        if (occupant) next[occupant] = next[dragging] // swap
        next[dragging] = h
        return next
      })
    }
    try {
      svgRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // Ignore if this pointer was never captured.
    }
    setDragging(null)
    setGhost(null)
  }

  // Viewbox framed to the whole box (terrain included), padded by a hex.
  const centres = boxHexes.map((h) => hexToPixel(h.q, h.r))
  const xs = centres.map((c) => c.x)
  const ys = centres.map((c) => c.y)
  const minX = Math.min(...xs) - HEX * 1.3
  const minY = Math.min(...ys) - HEX * 1.3
  const vbW = Math.max(...xs) - Math.min(...xs) + HEX * 2.6
  const vbH = Math.max(...ys) - Math.min(...ys) + HEX * 2.6

  const winnerLabel =
    trace?.result.winner === 'player' ? 'You win' : trace?.result.winner === 'enemy' ? 'Enemy wins' : 'Draw'
  const survivors = (side: Side) => (trace?.result.units ?? []).filter((u) => u.side === side && u.alive).length

  const zoneClass = (q: number) =>
    q < deployCols ? ' hex-cell--player' : q >= field.width - deployCols ? ' hex-cell--enemy' : ''

  const addTo = (setter: typeof setPlayerParty) => (sheetId: string) =>
    setter((p) => (p.length >= maxParty ? p : [...p, sheetId]))
  const removeFrom = (setter: typeof setPlayerParty) => (index: number) =>
    setter((p) => p.filter((_, i) => i !== index))
  const presetTo = (setter: typeof setPlayerParty) => (key: string) => setter([...PRESETS[key].party])

  const canFight = playerParty.length > 0 && enemyParty.length > 0

  return (
    <div className="skirmish">
      <header className="app__header">
        <a className="btn" href="#/">
          ◀ Map
        </a>
        <h1>Skirmish</h1>
        <label className="seed">
          Seed:
          <input value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <button className="btn" onClick={() => setSeed(`skirmish-${Math.floor(Math.random() * 1000)}`)}>
          New seed
        </button>
        <div className="field-ctrl" role="group" aria-label="Battlefield">
          <label>
            Area
            <select value={battlefieldMode} onChange={(e) => setBattlefieldMode(e.target.value)}>
              <option value="auto">Auto</option>
              {BATTLEFIELDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <span className="hint">
            {activeBattlefield.label} · {field.width}×{field.height} · {hexes.length} hexes
          </span>
        </div>
        <button className="btn" onClick={() => setShowTerrain(true)}>
          Terrain ⓘ
        </button>
        {phase === 'deploy' ? (
          <button className="btn btn--active" disabled={!canFight} onClick={() => setPhase('battle')}>
            Fight ▶
          </button>
        ) : (
          <button className="btn" onClick={() => setPhase('deploy')}>
            ◀ Redeploy
          </button>
        )}
      </header>

      <main className="skirmish__body">
        <div className="skirmish__field-wrap">
          <svg
            ref={svgRef}
            className={`skirmish-field theme-${activeBattlefield.theme}`}
            viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Battlefield"
            onPointerMove={onSvgMove}
            onPointerUp={onSvgUp}
          >
            {boxHexes.map((h) => {
              const { x, y } = hexToPixel(h.q, h.r)
              const k = hexKey(h)
              const kind = terrain.kinds.get(k)
              const cls = `hex-cell${zoneClass(h.q)}${kind ? ` hex-terrain--${kind}` : ''}`
              return <polygon key={k} className={cls} points={hexCorners(x, y)} />
            })}

            {/* Impassable borders (rivers, walls): a thick line on the shared edge. */}
            {[...terrain.blockedEdges].map((ek) => {
              const [ka, kb] = ek.split('|')
              const [aq, ar] = ka.split(',').map(Number)
              const [bq, br] = kb.split(',').map(Number)
              const a = hexToPixel(aq, ar)
              const b = hexToPixel(bq, br)
              const mx = (a.x + b.x) / 2
              const my = (a.y + b.y) / 2
              const dx = b.x - a.x
              const dy = b.y - a.y
              const len = Math.hypot(dx, dy) || 1
              const nx = -dy / len
              const ny = dx / len
              const half = HEX / 2
              return (
                <line
                  key={ek}
                  className="edge-blocked"
                  x1={(mx + nx * half).toFixed(2)}
                  y1={(my + ny * half).toFixed(2)}
                  x2={(mx - nx * half).toFixed(2)}
                  y2={(my - ny * half).toFixed(2)}
                />
              )
            })}

            {phase === 'battle' && frame ? (
              <>
                {frame.units.map((u) => {
                  const { x, y } = hexToPixel(u.q, u.r)
                  const st = statusOf(u)
                  const state = st === 'dead' ? ' unit--dead' : st === 'down' ? ' unit--down' : ''
                  const hp = u.maxHealth > 0 ? healthOf(u) / u.maxHealth : 0
                  const barW = HEX * 1.2
                  return (
                    <g key={u.id} className={`unit unit--${u.side}${state}`} transform={`translate(${x} ${y})`}>
                      <circle className="unit-body" r={HEX * 0.6} />
                      <text className="unit__tag" y={4}>
                        {initials(u.name)}
                      </text>
                      {u.rank === 'hero' && CROWN}
                      {st !== 'dead' && (
                        <>
                          <rect className="unit__hp-bg" x={-barW / 2} y={-HEX * 0.9} width={barW} height={5} rx={2} />
                          <rect className="unit__hp-fg" x={-barW / 2} y={-HEX * 0.9} width={barW * hp} height={5} rx={2} />
                        </>
                      )}
                    </g>
                  )
                })}
                {hitEvents.map((e, i) => {
                  const targetId = e.kind === 'attack' ? e.targetId : e.unitId
                  const target = frame.units.find((u) => u.id === targetId)
                  if (!target) return null
                  const { x, y } = hexToPixel(target.q, target.r)
                  const cls =
                    e.kind === 'attack'
                      ? e.crit
                        ? 'crit'
                        : e.charge
                          ? 'charge'
                          : e.flank
                            ? 'flank'
                            : 'hit'
                      : 'poison'
                  return (
                    <g key={`${frame.tick}-${i}`} className="fx" transform={`translate(${x} ${y})`}>
                      <circle className={`fx__flash fx__flash--${cls}`} r={HEX * 0.72} />
                      <text className={`fx__dmg fx__dmg--${cls}`} y={-HEX * 0.4}>
                        −{e.amount}
                      </text>
                    </g>
                  )
                })}
              </>
            ) : (
              [
                  ...playerUnits.map((u) => {
                    const pos = placement[u.instanceId]
                    if (!pos) return null
                    const { x, y } = hexToPixel(pos.q, pos.r)
                    const isDragging = dragging === u.instanceId
                    return (
                      <g
                        key={u.instanceId}
                        className={`unit unit--player unit--draggable${isDragging ? ' unit--dragging' : ''}`}
                        transform={`translate(${x} ${y})`}
                        onPointerDown={(e) => onTokenDown(e, u.instanceId)}
                      >
                        <circle className="unit-body" r={HEX * 0.6} />
                        <text className="unit__tag" y={4}>
                          {initials(u.name)}
                        </text>
                        {isHero(u.sheetId) && CROWN}
                      </g>
                    )
                  }),
                  ...enemyPlacements.map((p, i) => {
                    const { x, y } = hexToPixel(p.pos.q, p.pos.r)
                    return (
                      <g key={`enemy-${i}`} className="unit unit--enemy" transform={`translate(${x} ${y})`}>
                        <circle className="unit-body" r={HEX * 0.6} />
                        <text className="unit__tag" y={4}>
                          {initials(p.sheet.name)}
                        </text>
                        {p.sheet.rank === 'hero' && CROWN}
                      </g>
                    )
                  }),
                ]
            )}

            {ghost && dragging && (
              <circle className="unit-body unit--player unit__ghost" r={HEX * 0.6} cx={ghost.x} cy={ghost.y} />
            )}
          </svg>

          {phase === 'battle' && atEnd && trace && (
            <div className={`result-banner result-banner--${trace.result.winner}`} role="status">
              <strong>{winnerLabel}</strong>
              <span className="hint">
                {trace.result.ticks} ticks · survivors {survivors('player')} vs {survivors('enemy')}
              </span>
            </div>
          )}
          {phase === 'deploy' && (
            <div className="result-banner" role="status">
              <strong>Deploy</strong>
              <span className="hint">
                {canFight ? 'drag your units in the left zone, then Fight ▶' : 'both sides need at least one unit'}
              </span>
            </div>
          )}
        </div>

        <aside className="skirmish__side">
          {phase === 'deploy' ? (
            <>
              <PartyEditor
                title="Your party"
                party={playerParty}
                max={maxParty}
                onAdd={addTo(setPlayerParty)}
                onRemove={removeFrom(setPlayerParty)}
                onPreset={presetTo(setPlayerParty)}
              />
              <PartyEditor
                title="Enemy party"
                party={enemyParty}
                max={maxParty}
                onAdd={addTo(setEnemyParty)}
                onRemove={removeFrom(setEnemyParty)}
                onPreset={presetTo(setEnemyParty)}
              />
            </>
          ) : (
            <>
              {(['player', 'enemy'] as const).map((side) => (
                <div className="roster" key={side}>
                  <h3>{side === 'player' ? 'Your party' : 'Enemy'}</h3>
                  <ul>
                    {frame &&
                      frame.units
                        .filter((u) => u.side === side)
                        .map((u) => {
                          const st = statusOf(u)
                          return (
                            <li key={u.id} className={st === 'dead' ? 'roster--dead' : st === 'down' ? 'roster--down' : ''}>
                              {u.name}{' '}
                              <span className="hint">
                                {st === 'dead' ? 'dead' : st === 'down' ? 'down' : `${healthOf(u)}/${u.maxHealth}`}
                              </span>
                            </li>
                          )
                        })}
                  </ul>
                </div>
              ))}
              <div className="combat-log" aria-label="Combat log">
                <h3>Combat log</h3>
                <div className="combat-log__feed" ref={logRef}>
                  {shownEvents.length === 0 ? (
                    <div className="hint">deploy — no blows yet</div>
                  ) : (
                    shownEvents.map((e, i) => <LogLine key={i} e={e} />)
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </main>

      {phase === 'battle' && trace && (
        <div className="transport">
          <button
            className="btn"
            aria-label="Previous tick"
            disabled={tick <= 0}
            onClick={() => {
              setPlaying(false)
              setTick((t) => Math.max(0, t - 1))
            }}
          >
            ⏮
          </button>
          <button className="btn" onClick={() => (atEnd ? (setTick(0), setPlaying(true)) : setPlaying((p) => !p))}>
            {atEnd ? '↻ Replay' : playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button
            className="btn"
            aria-label="Next tick"
            disabled={tick >= trace.frames.length - 1}
            onClick={() => {
              setPlaying(false)
              setTick((t) => Math.min(trace.frames.length - 1, t + 1))
            }}
          >
            ⏭
          </button>
          <div className="speed-group" role="group" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`btn${speed === s ? ' btn--active' : ''}`}
                aria-pressed={speed === s}
                onClick={() => setSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={trace.frames.length - 1}
            value={tick}
            onChange={(e) => {
              setPlaying(false)
              setTick(Number(e.target.value))
            }}
          />
          <span className="hint">
            tick {frame?.tick ?? 0}/{trace.result.ticks}
          </span>
        </div>
      )}

      {showTerrain && (
        <div className="modal-backdrop" onClick={() => setShowTerrain(false)}>
          <div className="modal" role="dialog" aria-label="Terrain" onClick={(e) => e.stopPropagation()}>
            <h2>Terrain — {activeBattlefield.label}</h2>
            <ul className="modal__list">
              {legendFor(activeBattlefield).map((e, i) => (
                <li key={i}>
                  <HexSwatch theme={activeBattlefield.theme} kind={e.kind} edge={e.edge} />
                  <span>
                    <strong>{e.title}</strong> — {e.desc}
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="modal__subhead">Impassable edges</h3>
            <div className="modal__edge">
              <HexSwatch theme={activeBattlefield.theme} edge />
              <span>
                Thick borders (rivers, walls, ditches) block movement: melee cannot strike across one,
                though ranged fires over it. Cross only at a gap such as a bridge or ford. No hex is
                ever walled on more than three of its sides.
              </span>
            </div>
            <button className="btn" onClick={() => setShowTerrain(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
