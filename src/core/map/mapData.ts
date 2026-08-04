import type { MapDefinition } from './types'

// Hand-authored starter map. The shape is deliberately small for the MVP;
// it is real, connected, and stable across runs. Coordinates assume a
// ~1000 x 700 viewport.
//
// This is placeholder geography, NOT the final map. It roughly honours the
// design constraints (four Outer Capitals around the edge, Goldspring at the
// centre) but the vault's distance rules (capitals >= 6 edges apart, >= 10
// from Goldspring) are not yet satisfied and will need a larger graph.
//
// Capital labels follow the vault: Bookers Guild -> Bookerport,
// Masked Men -> Ashfall (volcano), Rain Tribe -> the Oxbow (river/forest),
// Sand Riders -> the Dunes.

export const MAP: MapDefinition = {
  nodes: [
    // --- Capitals (fixed) ---
    // Corners match the zone layout: Ashfall top-left, The Gold Sea (Dunes)
    // top-right, Bookerport bottom-left, Ironwood (Oxbow) bottom-right.
    // Symmetric, so every capital is equidistant from the centre.
    { id: 'ashfall', label: 'Ashfall', kind: 'capital', faction: 'masked-men', x: 10, y: -290 },
    { id: 'dunes', label: 'The Dunes', kind: 'capital', faction: 'sand-riders', x: 1990, y: -290 },
    { id: 'bookerport', label: 'Bookerport', kind: 'capital', faction: 'bookers-guild', x: 10, y: 1690 },
    { id: 'oxbow', label: 'The Oxbow', kind: 'capital', faction: 'rain-tribe', x: 1990, y: 1690 },

    // --- Goal (fixed) ---
    { id: 'goldspring', label: 'Goldspring', kind: 'goldspring', x: 1000, y: 700 },

    // --- Fixed interior nodes ---
    { id: 'north-gate', label: 'North Gate', kind: 'node', x: 1000, y: 320 },
    { id: 'south-ford', label: 'South Ford', kind: 'node', x: 1000, y: 1080 },
    { id: 'west-mire', label: 'West Mire', kind: 'node', x: 520, y: 700 },
    { id: 'east-scree', label: 'East Scree', kind: 'node', x: 1480, y: 700 },

    // --- Variable interior nodes (may be inactive on a given run) ---
    { id: 'nw-waypost', label: 'NW Waypost', kind: 'node', x: 600, y: 480, optional: true },
    { id: 'ne-waypost', label: 'NE Waypost', kind: 'node', x: 1400, y: 480, optional: true },
    { id: 'sw-waypost', label: 'SW Waypost', kind: 'node', x: 600, y: 920, optional: true },
    { id: 'se-waypost', label: 'SE Waypost', kind: 'node', x: 1400, y: 920, optional: true },
  ],
  edges: [
    // Bookerport is a port at the river mouth: its outward edge is water.
    { from: 'bookerport', to: 'nw-waypost', terrain: 'water' },
    { from: 'nw-waypost', to: 'north-gate', terrain: 'road' },
    { from: 'nw-waypost', to: 'west-mire', terrain: 'road' },

    { from: 'ashfall', to: 'ne-waypost', terrain: 'road' },
    { from: 'ne-waypost', to: 'north-gate', terrain: 'road' },
    { from: 'ne-waypost', to: 'east-scree', terrain: 'road' },

    { from: 'oxbow', to: 'sw-waypost', terrain: 'road' },
    { from: 'sw-waypost', to: 'west-mire', terrain: 'road' },
    { from: 'sw-waypost', to: 'south-ford', terrain: 'road' },

    { from: 'dunes', to: 'se-waypost', terrain: 'road' },
    { from: 'se-waypost', to: 'east-scree', terrain: 'road' },
    { from: 'se-waypost', to: 'south-ford', terrain: 'road' },

    // Inner ring into Goldspring.
    { from: 'north-gate', to: 'goldspring', terrain: 'road' },
    { from: 'south-ford', to: 'goldspring', terrain: 'water' },
    { from: 'west-mire', to: 'goldspring', terrain: 'road' },
    { from: 'east-scree', to: 'goldspring', terrain: 'road' },
  ],
}
