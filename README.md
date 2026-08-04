# Bound for Goldspring

A single-player roguelite that plays out on a graph of nodes and edges. You are the Captain of a small party, setting out from one of four Outer Capitals and pushing through contested territory to the centre of the world, Goldspring, to take on the Capital. The map is generated fresh each run and stays hidden until you draw near.

This is an early, in-development build. The map, travel, and the first resource and encounter systems work; combat and the character-build systems are still to come (see [Status](#status)).

## Playing the current build

```bash
npm install
npm run dev
```

Then open the local URL Vite prints.

- **Travel:** click a lit node and confirm, or double-click it. Or use the keyboard: arrow keys cycle the reachable nodes, space travels.
- **Fog of war:** only nodes near the Captain are drawn in full; the rest stay hidden until you approach.
- **Map:** drag to pan, scroll or pinch to zoom, and toggle whether all connections are shown or only the ones you have walked.
- **Resources:** each step costs food; when food runs out, morale drains instead. Camp, shop, wager, and tavern nodes let you spend and gamble to recover.
- **Seed:** every load picks a random seed; edit it to replay a specific map.

## Status

Working:

- Seeded, deterministic procedural map generation: an organic roads-first world with faction zones, a city, open fields, and a navigable river.
- Travel and fog of war, with a capability hook for gated waterways.
- A resource spine (gold, food, morale) with travel attrition and starvation.
- A node encounter framework with the economy encounters (rest, drink, wager) implemented.

Not yet built: combat, the character build (nation, race, profession), the party and recruitment, and the win condition. Combat nodes are inert for now.

## Commands

- `npm run dev` — start the dev server.
- `npm run build` — typecheck, then produce the static `dist/` bundle.
- `npm run preview` — serve the built bundle locally.
- `npm test` — run the test suite once (`npm run test:watch` for watch mode).
- `npm run typecheck` — types only, no build.

## Architecture

The hard rule: **game logic lives in `src/core/` and never imports React or touches the DOM.** The React layer in `src/ui/` renders core state and sends actions back; it holds no rules. This keeps the rules unit-testable without a browser and portable behind a future renderer or a mobile wrapper.

- `src/core/` — pure TypeScript, the source of truth for game state and rules.
  - `rng.ts` — a seeded PRNG. The core never uses `Math.random()`, so a run is fully reproducible from its seed.
  - `map/` — domain types, the map generator (`growMap`), graph-distance rules, and per-run event assignment.
  - `game/` — travel and fog of war, the resource pool, and the encounter registry.
  - `index.ts` — the core's public surface; the UI imports from here, not from deep paths.
- `src/ui/` — the React shell: the app state, the SVG map viewer, and styles.

The core is developed test-first: a failing test specifies each behaviour before the code that satisfies it.

## Tech

Vite, React, and TypeScript, with Vitest for the tests. The build is a static bundle, so it can be hosted as a play-in-browser page.

## Licence

No licence yet. All rights reserved for now.
