import { useEffect, useRef, useState } from 'react'
import { edgeKey } from '../core'
import type { EventType, MapDefinition, RunMap } from '../core'

// Renders the node/edge graph as SVG. Node positions are authored in the map
// data (no layout algorithm), so this is a direct draw. When graphics arrive,
// this component is the seam to swap for a PixiJS viewport; the map data and
// the run state it consumes stay the same.

interface Props {
  map: MapDefinition
  run: RunMap
  selectedId: string | null
  onSelect: (id: string) => void
  /** Request travel to a node (App decides if it is actually reachable). */
  onTravel: (id: string) => void
  /** The keyboard travel cursor: the reachable node currently highlighted. */
  cursorId: string | null
  /** The Captain's current node. */
  playerPos: string
  /** Nodes currently within sight (fog lifts here). */
  revealed: Set<string>
  /** Adjacent nodes the Captain can step to right now. */
  reachable: Set<string>
  /**
   * 'show' draws every edge on the map (overview, travelled ones tinted);
   * 'hide' is the true game view: only travelled edges and the edges leaving
   * the current position.
   */
  connections: 'show' | 'hide'
  /** Edges the Captain has crossed, keyed by `edgeKey`. */
  traveled: Set<string>
}

// Padding around the node bounds, in map units. Leaves room for node labels.
const PADDING = 120

// Distinct single-letter codes for the node markers (first letters collide:
// combat/camp, train/tavern). Full names show in the info panel.
const EVENT_CODE: Record<EventType, string> = {
  combat: 'C',
  camp: 'M',
  train: 'T',
  tavern: 'V',
  wager: 'W',
  recruit: 'R',
  shop: 'S',
  puzzle: 'P',
}

// Zones that get a visible perimeter drawn around their nodes. The Great Fields
// (the board itself) and the single-node fountain are left out.
const OUTLINED_ZONES = [
  'city-of-goldspring',
  'bookers-guild',
  'masked-men',
  'rain-tribe',
  'the-crimson-ordas',
] as const

interface Pt {
  x: number
  y: number
}

// Andrew's monotone-chain convex hull. Returns the hull points in order.
function convexHull(points: Pt[]): Pt[] {
  if (points.length < 3) return points
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const half = (src: Pt[]) => {
    const h: Pt[] = []
    for (const p of src) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop()
      h.push(p)
    }
    h.pop()
    return h
  }
  return [...half(pts), ...half([...pts].reverse())]
}

function centroidOf(pts: Pt[]): Pt {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length
  return { x: cx, y: cy }
}

// Deterministic 0..1 hash, so a zone's outline is irregular but stable.
function hash01(i: number): number {
  const v = Math.sin(i * 12.9898) * 43758.5453
  return v - Math.floor(v)
}

// Push each hull vertex outward from the centroid by `pad`, varied per vertex
// so the resulting shape is organic/irregular rather than a tidy scale-up.
function expandVaried(hull: Pt[], pad: number): Pt[] {
  const c = centroidOf(hull)
  return hull.map((p, i) => {
    const dx = p.x - c.x
    const dy = p.y - c.y
    const len = Math.hypot(dx, dy) || 1
    const p2 = pad * (0.7 + 0.6 * hash01(i + 1))
    return { x: p.x + (dx / len) * p2, y: p.y + (dy / len) * p2 }
  })
}

// A smooth CLOSED curve through the points (Catmull-Rom -> cubic Bezier), so
// the perimeter has no harsh corners.
function smoothClosedPath(pts: Pt[]): string {
  const n = pts.length
  if (n < 3) return ''
  const at = (i: number) => pts[((i % n) + n) % n]
  let d = `M ${at(0).x} ${at(0).y}`
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
  }
  return `${d} Z`
}

// A smooth OPEN curve through the points (Catmull-Rom -> cubic Bezier), used for
// the river band so the watercourse flows rather than kinking at each node.
function smoothOpenPath(pts: Pt[]): string {
  const n = pts.length
  if (n < 2) return ''
  const at = (i: number) => pts[Math.max(0, Math.min(n - 1, i))]
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
  }
  return d
}

// Perimeter padding per zone (map units). The Gold Sea is a vast desert, so its
// outline extends well beyond its sparse nodes.
const ZONE_PAD: Record<string, number> = {
  'the-crimson-ordas': 320,
  'masked-men': 80,
  'rain-tribe': 80,
  'bookers-guild': 70,
}

// A gently winding path between two points, so edges read as roads rather than
// straight lines. The bend is deterministic per edge (from its index), an S-ish
// cubic whose amount scales with length.
function roadPath(ax: number, ay: number, bx: number, by: number, i: number): string {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len // perpendicular unit
  const ny = dx / len
  const sign = i % 2 === 0 ? 1 : -1
  const mag = len * (0.1 + (i % 3) * 0.03) * sign
  const c1x = ax + dx / 3 + nx * mag
  const c1y = ay + dy / 3 + ny * mag
  const c2x = ax + (2 * dx) / 3 - nx * mag * 0.6
  const c2y = ay + (2 * dy) / 3 - ny * mag * 0.6
  return `M ${ax} ${ay} C ${c1x} ${c1y} ${c2x} ${c2y} ${bx} ${by}`
}

export function MapView({
  map,
  run,
  selectedId,
  onSelect,
  onTravel,
  cursorId,
  playerPos,
  revealed,
  reachable,
  connections,
  traveled,
}: Props) {
  const nodeById = new Map(map.nodes.map((n) => [n.id, n]))

  // Neighbours of the selected node, so we can highlight its links and the
  // nodes on the far end of them.
  const neighbourIds = new Set<string>()
  if (selectedId) {
    for (const e of map.edges) {
      if (e.from === selectedId) neighbourIds.add(e.to)
      else if (e.to === selectedId) neighbourIds.add(e.from)
    }
  }

  // A perimeter per outlined zone, sitting behind the graph. Goldspring is a
  // perfect circle; the factions are smooth, organic (corner-free) blobs, with
  // the Gold Sea's desert footprint far larger than its nodes.
  type ZoneArea =
    | { zone: string; kind: 'circle'; cx: number; cy: number; r: number }
    | { zone: string; kind: 'path'; d: string }
  const zoneAreas: ZoneArea[] = map.regions
    ? // The generator supplied exact regions: draw those (smoothing polygons).
      map.regions.map((region) =>
        region.kind === 'circle'
          ? { zone: region.zone, kind: 'circle', cx: region.cx, cy: region.cy, r: region.r }
          : { zone: region.zone, kind: 'path', d: smoothClosedPath(region.points) },
      )
    : // Fallback for maps without regions: derive hulls from the node positions.
      OUTLINED_ZONES.map((zone): ZoneArea | null => {
        const pts = map.nodes.filter((n) => n.zone === zone).map((n) => ({ x: n.x, y: n.y }))
        if (pts.length === 0) return null
        if (zone === 'city-of-goldspring') {
          const c = centroidOf(pts)
          const r = Math.max(...pts.map((p) => Math.hypot(p.x - c.x, p.y - c.y))) + 70
          return { zone, kind: 'circle', cx: c.x, cy: c.y, r }
        }
        const hull = expandVaried(convexHull(pts), ZONE_PAD[zone] ?? 70)
        return { zone, kind: 'path', d: smoothClosedPath(hull) }
      }).filter((a): a is ZoneArea => a !== null)

  // Frame the viewBox to the actual node bounds so any generated map fits
  // without clipping, regardless of how far the rings spread.
  const xs = map.nodes.map((n) => n.x)
  const ys = map.nodes.map((n) => n.y)
  const minX = Math.min(...xs) - PADDING
  const minY = Math.min(...ys) - PADDING
  const width = Math.max(...xs) - Math.min(...xs) + PADDING * 2
  const height = Math.max(...ys) - Math.min(...ys) + PADDING * 2

  // Pan/zoom: a transform on the content group. tx/ty are in viewBox units, k is
  // the zoom factor. Pointer drag pans, wheel and two-finger pinch zoom about
  // the cursor.
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState({ tx: 0, ty: 0, k: 1 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const drag = useRef<{ x: number; y: number } | null>(null)
  const pinch = useRef<{ dist: number; x: number; y: number } | null>(null)

  // Screen pixel -> viewBox coordinate, accounting for the letterboxed viewBox.
  const toVb = (clientX: number, clientY: number) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  const zoomAbout = (vx: number, vy: number, factor: number) =>
    setView((p) => {
      const k = Math.min(8, Math.max(0.25, p.k * factor))
      const f = k / p.k
      return { k, tx: vx - (vx - p.tx) * f, ty: vy - (vy - p.ty) * f }
    })

  // Wheel needs a non-passive listener to preventDefault the page scroll.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const v = toVb(e.clientX, e.clientY)
      zoomAbout(v.x, v.y, Math.exp(-e.deltaY * 0.0015))
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) drag.current = toVb(e.clientX, e.clientY)
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]

    if (pts.length >= 2) {
      // Pinch: zoom about the midpoint by the change in finger distance.
      const dx = pts[0].x - pts[1].x
      const dy = pts[0].y - pts[1].y
      const dist = Math.hypot(dx, dy)
      const mid = toVb((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2)
      // Exponent > 1 makes the pinch a touch more sensitive than a raw 1:1 ratio.
      if (pinch.current) zoomAbout(mid.x, mid.y, (dist / pinch.current.dist) ** 1.7)
      pinch.current = { dist, x: mid.x, y: mid.y }
      drag.current = null
      return
    }

    if (drag.current) {
      const v = toVb(e.clientX, e.clientY)
      const dx = v.x - drag.current.x
      const dy = v.y - drag.current.y
      // Advance the anchor so each move applies only the incremental delta.
      drag.current = { x: v.x, y: v.y }
      setView((p) => ({ ...p, tx: p.tx + dx, ty: p.ty + dy }))
    }
  }

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) drag.current = null
  }

  return (
    <svg
      ref={svgRef}
      className="map-view"
      viewBox={`${minX} ${minY} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="Game map"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
      {/* Zone perimeters sit behind everything. */}
      {zoneAreas.map((area) =>
        area.kind === 'circle' ? (
          <circle
            key={area.zone}
            className={`zone-area zone--${area.zone}`}
            cx={area.cx}
            cy={area.cy}
            r={area.r}
          />
        ) : (
          <path key={area.zone} className={`zone-area zone--${area.zone}`} d={area.d} />
        ),
      )}

      {/* River band: a translucent blue watercourse following the river nodes,
          drawn beneath the edges so the dotted water links read on top of it. */}
      {(map.rivers ?? []).map((river, i) => (
        <path key={`river-${i}`} className="river" d={smoothOpenPath(river)} />
      ))}

      {/* Edges. The whole graph is generated up front (growMap). In 'show' every
          edge is drawn (travelled ones tinted). In 'hide' (the true game view)
          only travelled edges and edges leaving the current position appear.
          Roads wind; water edges are straight and dotted (boat + captain). */}
      {map.edges.map((edge, i) => {
        const from = nodeById.get(edge.from)!
        const to = nodeById.get(edge.to)!
        const isTraveled = traveled.has(edgeKey(edge.from, edge.to))
        const leavesHere = edge.from === playerPos || edge.to === playerPos
        // In the game view, hide anything not yet walked or steppable from here.
        if (connections === 'hide' && !isTraveled && !leavesHere) return null
        const d =
          edge.terrain === 'water'
            ? `M ${from.x} ${from.y} L ${to.x} ${to.y}`
            : roadPath(from.x, from.y, to.x, to.y, i)
        const touchesSelected = edge.from === selectedId || edge.to === selectedId
        const classes = [
          'edge',
          `edge--${edge.terrain}`,
          isTraveled ? 'edge--traveled' : 'edge--untraveled',
          touchesSelected ? 'edge--active' : '',
        ]
          .filter(Boolean)
          .join(' ')
        return <path key={i} className={classes} d={d} />
      })}

      {map.nodes.map((node) => {
        const runNode = run.nodes[node.id]
        const inactive = !runNode?.active
        const isSeen = revealed.has(node.id)
        const isCurrent = node.id === playerPos
        const isReachable = reachable.has(node.id)
        const r = node.kind === 'node' ? 40 : node.kind === 'capital' ? 74 : 60
        const classes = [
          'node',
          `node--${node.kind}`,
          // Fog: hidden nodes lose their zone/event styling and become
          // featureless markers until the Captain draws near.
          isSeen ? (node.zone ? `zone--${node.zone}` : '') : 'node--fog',
          isSeen && node.river ? 'node--river' : '',
          inactive ? 'node--inactive' : '',
          node.id === selectedId ? 'node--selected' : '',
          isCurrent ? 'node--current' : '',
          isReachable ? 'node--reachable' : '',
          node.id === cursorId ? 'node--cursor' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <g
            key={node.id}
            className={classes}
            transform={`translate(${node.x} ${node.y})`}
            onClick={() => isSeen && onSelect(node.id)}
            onDoubleClick={() => isReachable && onTravel(node.id)}
            role="button"
            tabIndex={isSeen ? 0 : -1}
            aria-hidden={!isSeen}
            aria-label={`${node.label}${runNode?.event ? `, ${runNode.event}` : ''}`}
            onKeyDown={(e) => {
              if (isSeen && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                onSelect(node.id)
              }
            }}
          >
            {/* Halo rings that make the two "where am I / where next" markers
                pop out clearly. Drawn behind the node body. */}
            {isCurrent && <circle className="node__here-ring" r={r + 22} />}
            {node.id === cursorId && <circle className="node__cursor-ring" r={r + 16} />}
            <circle r={r} />
            {/* Only landmarks (capitals, fountain) get a name label; interior
                nodes would just be noise. Hidden nodes show nothing. */}
            {isSeen && node.kind !== 'node' && (
              <text className="node__label" y={node.kind === 'capital' ? -72 : -58}>
                {node.label}
              </text>
            )}
            {isSeen && runNode?.active && runNode.event && (
              <text className="node__event" y={node.kind === 'node' ? 44 : 62}>
                {EVENT_CODE[runNode.event]}
              </text>
            )}
          </g>
        )
      })}
      </g>
    </svg>
  )
}
