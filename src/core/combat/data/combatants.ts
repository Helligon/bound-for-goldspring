// Combatant templates, mirrored from the vault (Mechanics/Combat/Combatants/*).
// Flat, pre-statted sheets on the STR/SPD/DEX model; the sim consumes these
// directly, so no build pillars are involved. Health is derived from str.
// Numbers are dummy placeholders.

import type { CombatantSheet } from '../../entities/types'

export const COMBATANTS: CombatantSheet[] = [
  // --- Bookers Guild ---
  { id: 'bookers-hired-blade', name: 'Hired Blade', kind: 'combatant', species: 'human', affiliation: 'bookers-guild', rank: 'mook', stats: { str: 4, spd: 3, dex: 2 }, weapon: 'arming-sword', secondary: null, armourValue: 2, mount: null, capabilities: [] },
  { id: 'bookers-powder-clerk', name: 'Powder Clerk', kind: 'combatant', species: 'human', affiliation: 'bookers-guild', rank: 'mook', stats: { str: 2, spd: 2, dex: 4 }, weapon: 'powdershot-wand', secondary: 'dagger', armourValue: 1, mount: null, capabilities: [] },
  { id: 'bookers-cinder-adept', name: 'Cinder Adept', kind: 'combatant', species: 'human', affiliation: 'bookers-guild', rank: 'hero', stats: { str: 3, spd: 2, dex: 5 }, weapon: 'cinder-wand', secondary: 'short-sword', armourValue: 3, mount: 'mechanised-armour', capabilities: [] },

  // --- Masked Men ---
  { id: 'masked-fury-berserker', name: 'Fury Berserker', kind: 'combatant', species: 'human', affiliation: 'masked-men', rank: 'mook', stats: { str: 5, spd: 3, dex: 1 }, weapon: 'spiked-club', secondary: null, armourValue: 4, mount: null, capabilities: ['fury', 'claws-of-the-masked-men'] },
  { id: 'masked-fearmonger', name: 'Fearmonger', kind: 'combatant', species: 'human', affiliation: 'masked-men', rank: 'mook', stats: { str: 4, spd: 4, dex: 2 }, weapon: 'sickle', secondary: null, armourValue: 2, mount: null, capabilities: ['fear-in-numbers'] },
  { id: 'masked-boar-rider', name: 'Boar Rider', kind: 'combatant', species: 'human', affiliation: 'masked-men', rank: 'hero', stats: { str: 6, spd: 4, dex: 2 }, weapon: 'blood-iron', secondary: 'spatha', armourValue: 4, mount: 'dire-boar', capabilities: ['claws-of-the-masked-men'] },

  // --- Rain Tribe ---
  { id: 'rain-blowgun-hunter', name: 'Blowgun Hunter', kind: 'combatant', species: 'human', affiliation: 'rain-tribe', rank: 'mook', stats: { str: 2, spd: 4, dex: 5 }, weapon: 'blowgun', secondary: 'obsidian-hand-wood', armourValue: 0, mount: null, capabilities: [] },
  { id: 'rain-spear-warden', name: 'Spear Warden', kind: 'combatant', species: 'human', affiliation: 'rain-tribe', rank: 'mook', stats: { str: 4, spd: 3, dex: 2 }, weapon: 'obsidian-spear', secondary: null, armourValue: 1, mount: null, capabilities: [] },
  { id: 'rain-bond-beast', name: 'Bond Beast', kind: 'combatant', species: 'animal', affiliation: 'rain-tribe', rank: 'hero', stats: { str: 5, spd: 5, dex: 3 }, naturalWeapon: { name: 'claw', rof: 2, governed: 'spd' }, armourValue: 2, mount: null, capabilities: ['fear-in-numbers'] },

  // --- The Crimson Ordas ---
  { id: 'ordas-mounted-archer', name: 'Mounted Archer', kind: 'combatant', species: 'human', affiliation: 'the-crimson-ordas', rank: 'mook', stats: { str: 3, spd: 3, dex: 5 }, weapon: 'desert-bow', secondary: 'keris', armourValue: 1, mount: 'camel', capabilities: [] },
  { id: 'ordas-blade-dancer', name: 'Blade Dancer', kind: 'combatant', species: 'human', affiliation: 'the-crimson-ordas', rank: 'mook', stats: { str: 4, spd: 5, dex: 3 }, weapon: 'shamshir', secondary: 'keris', armourValue: 1, mount: null, capabilities: [] },
  { id: 'ordas-veil-drunk-charger', name: 'Veil-Drunk Charger', kind: 'combatant', species: 'human', affiliation: 'the-crimson-ordas', rank: 'hero', stats: { str: 6, spd: 4, dex: 2 }, weapon: 'glaive', secondary: 'khopesh', armourValue: 2, mount: 'oakhish-the-sand-wyrm', capabilities: [] },

  // --- Neutral ---
  { id: 'neutral-bandit', name: 'Bandit', kind: 'combatant', species: 'human', affiliation: 'neutral', rank: 'mook', stats: { str: 3, spd: 3, dex: 3 }, weapon: 'short-sword', secondary: null, armourValue: 1, mount: null, capabilities: [] },
  { id: 'neutral-crossbowman', name: 'Crossbowman', kind: 'combatant', species: 'human', affiliation: 'neutral', rank: 'mook', stats: { str: 3, spd: 2, dex: 4 }, weapon: 'old-crossbow', secondary: 'dagger', armourValue: 1, mount: null, capabilities: [] },
  { id: 'neutral-sellsword', name: 'Sellsword', kind: 'combatant', species: 'human', affiliation: 'neutral', rank: 'hero', stats: { str: 5, spd: 3, dex: 3 }, weapon: 'bastard-sword', secondary: 'hatchet', armourValue: 4, mount: null, capabilities: [] },
  { id: 'neutral-wolf', name: 'Wolf', kind: 'combatant', species: 'animal', affiliation: 'neutral', rank: 'mook', stats: { str: 3, spd: 6, dex: 3 }, naturalWeapon: { name: 'bite', rof: 2, governed: 'spd' }, armourValue: 0, mount: null, capabilities: ['fear-in-numbers'] },
  { id: 'neutral-boar', name: 'Boar', kind: 'combatant', species: 'animal', affiliation: 'neutral', rank: 'mook', stats: { str: 5, spd: 4, dex: 1 }, naturalWeapon: { name: 'gore', rof: 1, governed: 'spd' }, armourValue: 2, mount: null, capabilities: [] },
  { id: 'neutral-legendary-beast', name: 'Legendary Beast', kind: 'combatant', species: 'animal', affiliation: 'neutral', rank: 'hero', stats: { str: 8, spd: 4, dex: 2 }, naturalWeapon: { name: 'maul', rof: 1, governed: 'spd' }, armourValue: 3, mount: null, capabilities: ['taunt'] },

  // --- Goldspring ---
  { id: 'goldspring-fountain-warden', name: 'Fountain Warden', kind: 'combatant', species: 'human', affiliation: 'goldspring', rank: 'hero', stats: { str: 5, spd: 4, dex: 3 }, weapon: 'obsidian-spear', secondary: null, armourValue: 3, mount: null, capabilities: [] },
  { id: 'goldspring-gilded-executioner', name: 'Gilded Executioner', kind: 'combatant', species: 'human', affiliation: 'goldspring', rank: 'hero', stats: { str: 7, spd: 3, dex: 2 }, weapon: 'great-mace', secondary: 'khopesh', armourValue: 4, mount: null, capabilities: [] },
  { id: 'goldspring-ash-sentinel', name: 'Ash Sentinel', kind: 'combatant', species: 'human', affiliation: 'goldspring', rank: 'mook', stats: { str: 5, spd: 3, dex: 2 }, weapon: 'blood-iron', secondary: 'spatha', armourValue: 5, mount: null, capabilities: [] },
  { id: 'goldspring-powder-marshal', name: 'Powder Marshal', kind: 'combatant', species: 'human', affiliation: 'goldspring', rank: 'mook', stats: { str: 3, spd: 3, dex: 5 }, weapon: 'powdershot-wand', secondary: 'arming-sword', armourValue: 2, mount: null, capabilities: [] },
]
