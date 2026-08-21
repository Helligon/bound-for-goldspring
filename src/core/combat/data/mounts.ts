// Mounts, mirrored from the vault (Mechanics/Animal Companions/List of Mounts.md).
// A mount is a bonus package on its rider, not a separate creature: it grants a
// health bonus and charge and sets the rider's move speed while mounted. Numbers
// are dummy placeholders.

import type { Mount } from '../../entities/types'

export const MOUNTS: Record<string, Mount> = {
  camel: { id: 'camel', name: 'Camel', kind: 'mount', tier: 'standard', affiliation: 'neutral', grants: { healthBonus: 6, charge: 2, spd: 4 }, capabilities: ['desert-sure-footed'], upkeep: 1, value: 40 },
  horse: { id: 'horse', name: 'Horse', kind: 'mount', tier: 'standard', affiliation: 'neutral', grants: { healthBonus: 5, charge: 3, spd: 6 }, capabilities: ['fast-on-open-ground'], upkeep: 1, value: 50 },
  'dire-boar': { id: 'dire-boar', name: 'Dire Boar', kind: 'mount', tier: 'legendary', affiliation: 'masked-men', grants: { healthBonus: 10, charge: 4, spd: 4 }, capabilities: [], upkeep: 2, value: 120 },
  'marsh-dragon': { id: 'marsh-dragon', name: 'Marsh Dragon', kind: 'mount', tier: 'legendary', affiliation: 'rain-tribe', grants: { healthBonus: 9, charge: 3, spd: 4 }, capabilities: ['cross-waterways'], upkeep: 2, value: 130 },
  'oakhish-the-sand-wyrm': { id: 'oakhish-the-sand-wyrm', name: "Oa'khish, The Sand Wyrm", kind: 'mount', tier: 'legendary', affiliation: 'the-crimson-ordas', grants: { healthBonus: 14, charge: 6, spd: 5 }, capabilities: ['desert-native'], upkeep: 3, value: 200 },
  'mechanised-armour': { id: 'mechanised-armour', name: 'Mechanised Armour', kind: 'mount', tier: 'legendary', affiliation: 'bookers-guild', grants: { healthBonus: 16, charge: 3, spd: 2 }, capabilities: ['mechanical', 'no-food-upkeep'], upkeep: 0, value: 180 },
}
