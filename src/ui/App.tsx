import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  actionsFor,
  canResolve,
  canTravel,
  createGame,
  createResources,
  generateRun,
  growMap,
  neighbours,
  resolveAction,
  revealedNodes,
  Rng,
  travelStep,
  ZONE_LABELS,
} from '../core'
import type {
  EncounterActionId,
  GameState,
  GenConfig,
  MapDefinition,
  Resources,
  RunMap,
  TravelCaps,
} from '../core'
import { MapView } from './MapView'

// The React shell. It owns no game rules; it renders state from the core and
// sends player actions back into it. Keep logic in src/core, not here.

// Generation parameters, settled during tuning and now baked in (the sliders
// that exposed them have been retired).
const GEN_CONFIG: Required<GenConfig> = {
  minNodeDist: 320,
  fieldsDensity: 0.16,
}

export function App() {
  // Randomise the seed on each load: run-<random 3-digit number>.
  const [seed, setSeed] = useState(() => `run-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`)
  const [viewKey, setViewKey] = useState(0) // bump to reset the map pan/zoom
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 'show' = the whole map's edges (overview); 'hide' = the true game view, only
  // travelled edges and edges leaving the current position.
  const [connections, setConnections] = useState<'show' | 'hide'>('show')
  // Which reachable node the keyboard cursor is on (index into reachableList).
  const [cursor, setCursor] = useState(0)
  // Dev toggle: let the Captain cross waterways (stands in for the future boat +
  // captain rule). When on, water edges count as reachable.
  const [canCrossWater, setCanCrossWater] = useState(false)
  const caps = useMemo<TravelCaps>(() => ({ canCrossWater }), [canCrossWater])
  const [stake, setStake] = useState(1)

  // A full run: procedurally generate the map, then assign this run's events.
  const map: MapDefinition = useMemo(() => growMap(seed, GEN_CONFIG), [seed])
  const run: RunMap = useMemo(() => generateRun(map, seed), [map, seed])

  // The Captain starts at an Outer Capital. (Choosing which capital is a build
  // decision for later; for now we take the first.)
  const startId = useMemo(
    () => map.nodes.find((n) => n.kind === 'capital')?.id ?? map.nodes[0].id,
    [map],
  )
  // The live run: the Captain's position/fog state plus the resource pool, held
  // together so a travel step updates both atomically.
  const [session, setSession] = useState<{ game: GameState; resources: Resources; nonce: number }>(
    () => ({ game: createGame(map, startId), resources: createResources(), nonce: 0 }),
  )
  const { game, resources } = session

  // New map (seed change) restarts the run: back to the start capital with a
  // fresh resource pool.
  useEffect(() => {
    setSession({ game: createGame(map, startId), resources: createResources(), nonce: 0 })
    setSelectedId(null)
  }, [map, startId])

  // Fog: what the Captain can currently see, and where they can step next.
  const revealed = useMemo(() => revealedNodes(map, game), [map, game])
  const reachable = useMemo(
    () => new Set(neighbours(map, game.position).filter((id) => canTravel(map, game, id, caps))),
    [map, game, caps],
  )

  // The reachable nodes as an ordered list, sorted clockwise from north around
  // the current position, so the arrow keys cycle through them predictably.
  const reachableList = useMemo(() => {
    const here = map.nodes.find((n) => n.id === game.position)
    if (!here) return []
    return [...reachable]
      .map((id) => {
        const n = map.nodes.find((m) => m.id === id)!
        return { id, angle: Math.atan2(n.x - here.x, here.y - n.y) } // 0 = north, cw
      })
      .sort((a, b) => a.angle - b.angle)
      .map((e) => e.id)
  }, [map, reachable, game.position])

  // Keep the cursor in range as the reachable set changes (e.g. after a move).
  useEffect(() => {
    setCursor(0)
  }, [reachableList])

  const cursorId = reachableList[cursor] ?? null

  const goTo = useCallback(
    (id: string) => {
      // One travel step: move and pay the food cost together (core rule). The
      // functional update reads the latest session, so it never uses stale state.
      setSession((s) => ({ ...travelStep(map, s.game, s.resources, id, caps), nonce: s.nonce }))
      setSelectedId(id)
    },
    [map, caps],
  )

  // Resolve an encounter action at the current node. Seeds a per-action Rng
  // from the session nonce so wagers vary yet stay replayable, then bumps it.
  const doAction = useCallback(
    (actionId: EncounterActionId, amount?: number) => {
      setSession((s) => {
        const rng = new Rng(`enc:${seed}:${s.nonce}`)
        return { ...s, resources: resolveAction(s.resources, actionId, rng, amount), nonce: s.nonce + 1 }
      })
    },
    [seed],
  )

  // Keyboard travel: arrows cycle the reachable list, space/enter confirms.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack typing in the seed field.
      if (e.target instanceof HTMLInputElement) return
      if (reachableList.length === 0) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setCursor((c) => (c + 1) % reachableList.length)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setCursor((c) => (c - 1 + reachableList.length) % reachableList.length)
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        const target = reachableList[cursor]
        if (target) goTo(target)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [reachableList, cursor, goTo])

  const cursorNode = cursorId ? map.nodes.find((n) => n.id === cursorId) : undefined
  const cursorEvent = cursorId ? run.nodes[cursorId]?.event : undefined

  const currentEvent = run.nodes[game.position]?.event
  const encounterActions = actionsFor(currentEvent)

  return (
    <div className="app">
      <header className="app__header">
        <h1>Bound for Goldspring</h1>
        <a className="btn" href="#/skirmish">
          Skirmish ▶
        </a>
        <label className="seed">
          Seed:
          <input value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <button className="btn" onClick={() => setViewKey((k) => k + 1)}>
          Reset view
        </button>
        <button
          className={`btn${canCrossWater ? ' btn--active' : ''}`}
          aria-pressed={canCrossWater}
          onClick={() => setCanCrossWater((v) => !v)}
        >
          Waterways: {canCrossWater ? 'on' : 'off'}
        </button>
        <fieldset className="radio-group" aria-label="Connections">
          <legend>Connections</legend>
          <label className="toggle">
            <input
              type="radio"
              name="connections"
              checked={connections === 'show'}
              onChange={() => setConnections('show')}
            />
            Show
          </label>
          <label className="toggle">
            <input
              type="radio"
              name="connections"
              checked={connections === 'hide'}
              onChange={() => setConnections('hide')}
            />
            Hide
          </label>
        </fieldset>

        {/* The keyboard travel cursor: which reachable node is highlighted, and
            how to move it. Arrows cycle, space travels. */}
        <div className="cursor-readout" aria-live="polite">
          {cursorNode ? (
            <>
              <span className="cursor-readout__name">{cursorNode.label}</span>
              <span className="cursor-readout__meta">
                {cursorNode.zone ? ZONE_LABELS[cursorNode.zone] : cursorNode.kind}
                {cursorEvent ? ` · ${cursorEvent}` : ''}
              </span>
              <span className="cursor-readout__pos">
                {cursor + 1}/{reachableList.length}
              </span>
              <span className="hint">← → cycle · space to travel</span>
            </>
          ) : (
            <span className="hint">no routes from here</span>
          )}
        </div>

        <span className="hint">scroll / pinch to zoom, drag to pan. Double-click a lit node to travel.</span>
      </header>

      <main className="map-area" aria-label="Map">
        <MapView
          key={viewKey}
          map={map}
          run={run}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onTravel={(id) => {
            if (reachable.has(id)) goTo(id)
          }}
          playerPos={game.position}
          revealed={revealed}
          reachable={reachable}
          cursorId={cursorId}
          connections={connections}
          traveled={game.traveled}
        />
        <div className="hud" aria-label="Resources">
          <span className="hud__stat">
            <span className="hud__label">Gold</span> {resources.gold}
          </span>
          <span className={`hud__stat${resources.food === 0 ? ' hud__stat--warn' : ''}`}>
            <span className="hud__label">Food</span> {resources.food}
          </span>
          <span className={`hud__stat${resources.morale <= 20 ? ' hud__stat--warn' : ''}`}>
            <span className="hud__label">Morale</span> {resources.morale}
          </span>
        </div>
        {encounterActions.length > 0 && (
          <aside className="encounter-panel" aria-label="Encounter">
            <h2>{currentEvent}</h2>
            <ul>
              {encounterActions.map((a) => {
                const amount = a.needsStake ? stake : undefined
                const ok = canResolve(resources, a.id, amount)
                return (
                  <li key={a.id}>
                    <button className="btn" disabled={!ok} onClick={() => doAction(a.id, amount)}>
                      {a.label}
                    </button>
                    <span className="encounter-panel__summary">{a.summary}</span>
                    {a.needsStake && (
                      <input
                        type="number"
                        min={1}
                        max={resources.gold}
                        step={1}
                        value={stake}
                        onChange={(e) =>
                          setStake(
                            Math.max(1, Math.min(resources.gold, Math.round(Number(e.target.value)) || 1)),
                          )
                        }
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </aside>
        )}
      </main>
    </div>
  )
}
