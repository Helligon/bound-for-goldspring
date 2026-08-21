// Weapons, mirrored from the vault (Mechanics/Weapons/*). The old vault
// `attackSpeed` modifier is replaced by `rof`, the weapon's rate of fire by
// type: dagger 3, one-handed 2, two-handed and polearm 1, bow 2, crossbow 1,
// powdershot 0.5, thrown 1. Melee adds rof to SPD; ranged and thrown add it to
// DEX. Weapons keep their `str` modifier and any `charge` (braced polearms).
// Numbers are dummy placeholders. Auldersmiths weapons are not ingested yet
// (no combatant references them).

import type { Item } from '../../entities/types'

export const WEAPONS: Record<string, Item> = {
  // --- Neutral ---
  dagger: { id: 'dagger', name: 'Dagger', kind: 'weapon', type: 'dagger', faction: 'neutral', modifiers: { str: 1 }, rof: 3, capabilities: ['1h'], value: 10 },
  'short-sword': { id: 'short-sword', name: 'Short Sword', kind: 'weapon', type: 'sword', faction: 'neutral', modifiers: { str: 2 }, rof: 2, capabilities: ['1h'], value: 16 },
  'arming-sword': { id: 'arming-sword', name: 'Arming Sword', kind: 'weapon', type: 'sword', faction: 'neutral', modifiers: { str: 3 }, rof: 2, capabilities: ['1h'], value: 26 },
  hatchet: { id: 'hatchet', name: 'Hatchet', kind: 'weapon', type: 'axe', faction: 'neutral', modifiers: { str: 2 }, rof: 2, capabilities: ['1h'], value: 15 },
  flail: { id: 'flail', name: 'Flail', kind: 'weapon', type: 'blunt', faction: 'neutral', modifiers: { str: 3 }, rof: 2, capabilities: ['1h'], value: 22 },
  mace: { id: 'mace', name: 'Mace', kind: 'weapon', type: 'blunt', faction: 'neutral', modifiers: { str: 4 }, rof: 2, capabilities: ['1h'], value: 24 },
  'bastard-sword': { id: 'bastard-sword', name: 'Bastard Sword', kind: 'weapon', type: 'sword', faction: 'neutral', modifiers: { str: 4 }, rof: 1, capabilities: ['2h'], value: 48 },
  claymore: { id: 'claymore', name: 'Claymore', kind: 'weapon', type: 'sword', faction: 'neutral', modifiers: { str: 5 }, rof: 1, capabilities: ['2h'], value: 64 },
  'battle-axe': { id: 'battle-axe', name: 'Battle Axe', kind: 'weapon', type: 'axe', faction: 'neutral', modifiers: { str: 6 }, rof: 1, capabilities: ['2h'], value: 72 },
  'old-crossbow': { id: 'old-crossbow', name: 'Old Crossbow', kind: 'weapon', type: 'ranged', faction: 'neutral', modifiers: { str: 3 }, rof: 1, capabilities: ['pierce'], value: 44 },
  'trusty-bow': { id: 'trusty-bow', name: 'Trusty Bow', kind: 'weapon', type: 'ranged', faction: 'neutral', modifiers: { str: 2 }, rof: 2, capabilities: ['pierce'], value: 44 },

  // --- Bookers Guild ---
  'storm-banger': { id: 'storm-banger', name: 'Storm Banger', kind: 'weapon', type: 'alchemical', faction: 'bookers-guild', modifiers: { str: 1 }, rof: 1, capabilities: ['thrown', 'also-ranged', 'stun'], value: 30 },
  'cinder-wand': { id: 'cinder-wand', name: 'Cinder Wand', kind: 'weapon', type: 'alchemical', faction: 'bookers-guild', modifiers: { str: 1 }, rof: 1, capabilities: ['thrown', 'also-ranged', 'burn'], value: 30 },
  'powdershot-wand': { id: 'powdershot-wand', name: 'Powdershot Wand', kind: 'weapon', type: 'alchemical', faction: 'bookers-guild', modifiers: { str: 2 }, rof: 0.5, capabilities: ['thrown', 'also-ranged', 'pierce'], value: 45 },

  // --- Masked Men ---
  spatha: { id: 'spatha', name: 'Spatha', kind: 'weapon', type: 'sword', faction: 'masked-men', modifiers: { str: 3 }, rof: 2, capabilities: ['1h'], value: 30 },
  sickle: { id: 'sickle', name: 'Sickle', kind: 'weapon', type: 'other', faction: 'masked-men', modifiers: { str: 2 }, rof: 2, capabilities: ['1h'], value: 28 },
  'spiked-mace': { id: 'spiked-mace', name: 'Spiked Mace', kind: 'weapon', type: 'blunt', faction: 'masked-men', modifiers: { str: 4 }, rof: 2, capabilities: ['1h'], value: 34 },
  'spiked-club': { id: 'spiked-club', name: 'Spiked Club', kind: 'weapon', type: 'blunt', faction: 'masked-men', modifiers: { str: 5 }, rof: 1, capabilities: ['2h'], value: 50 },
  hookpole: { id: 'hookpole', name: 'Hookpole', kind: 'weapon', type: 'polearm', faction: 'masked-men', modifiers: { str: 3 }, rof: 1, capabilities: ['2h'], value: 42 },
  'blood-iron': { id: 'blood-iron', name: 'Blood Iron', kind: 'weapon', type: 'polearm', faction: 'masked-men', modifiers: { str: 4 }, rof: 1, charge: 1, capabilities: ['2h'], value: 48 },
  'sulphur-banger': { id: 'sulphur-banger', name: 'Sulphur Banger', kind: 'weapon', type: 'alchemical', faction: 'masked-men', modifiers: { str: 1 }, rof: 1, capabilities: ['thrown', 'also-ranged', 'poison'], value: 30 },
  'talon-bolas': { id: 'talon-bolas', name: 'Talon Bolas', kind: 'weapon', type: 'ranged', faction: 'masked-men', modifiers: { str: 2 }, rof: 1, capabilities: ['thrown', 'stun'], value: 40 },
  'spear-thrower': { id: 'spear-thrower', name: 'Spear Thrower', kind: 'weapon', type: 'ranged', faction: 'masked-men', modifiers: { str: 4 }, rof: 1, capabilities: ['thrown', 'pierce'], value: 40 },

  // --- Rain Tribe ---
  'obsidian-hand-wood': { id: 'obsidian-hand-wood', name: 'Obsidian Hand Wood', kind: 'weapon', type: 'other', faction: 'rain-tribe', modifiers: { str: 2 }, rof: 2, capabilities: ['1h'], value: 20 },
  'sharpened-ironwood-baton': { id: 'sharpened-ironwood-baton', name: 'Sharpened Ironwood Baton', kind: 'weapon', type: 'blunt', faction: 'rain-tribe', modifiers: { str: 1 }, rof: 2, capabilities: ['1h'], value: 18 },
  'ironwood-club': { id: 'ironwood-club', name: 'Ironwood Club', kind: 'weapon', type: 'blunt', faction: 'rain-tribe', modifiers: { str: 3 }, rof: 2, capabilities: ['1h'], value: 16 },
  'ironwood-longstaff': { id: 'ironwood-longstaff', name: 'Ironwood Longstaff', kind: 'weapon', type: 'polearm', faction: 'rain-tribe', modifiers: { str: 4 }, rof: 1, charge: 1, capabilities: ['2h'], value: 40 },
  'obsidian-spear': { id: 'obsidian-spear', name: 'Obsidian Spear', kind: 'weapon', type: 'polearm', faction: 'rain-tribe', modifiers: { str: 5 }, rof: 1, charge: 2, capabilities: ['2h'], value: 78 },
  'poison-pouch': { id: 'poison-pouch', name: 'Poison Pouch', kind: 'weapon', type: 'alchemical', faction: 'rain-tribe', modifiers: { str: 1 }, rof: 1, capabilities: ['thrown', 'also-ranged', 'poison'], value: 30 },
  blowgun: { id: 'blowgun', name: 'Blowgun', kind: 'weapon', type: 'ranged', faction: 'rain-tribe', modifiers: { str: 2 }, rof: 2, capabilities: ['poison'], value: 35 },
  'jungle-shortbow': { id: 'jungle-shortbow', name: 'Jungle Shortbow', kind: 'weapon', type: 'ranged', faction: 'rain-tribe', modifiers: { str: 3 }, rof: 2, capabilities: ['poison'], value: 50 },

  // --- The Crimson Ordas ---
  khopesh: { id: 'khopesh', name: 'Khopesh', kind: 'weapon', type: 'sword', faction: 'the-crimson-ordas', modifiers: { str: 3 }, rof: 2, capabilities: ['1h'], value: 32 },
  keris: { id: 'keris', name: 'Keris', kind: 'weapon', type: 'dagger', faction: 'the-crimson-ordas', modifiers: { str: 2 }, rof: 3, capabilities: ['1h'], value: 30 },
  shamshir: { id: 'shamshir', name: 'Shamshir', kind: 'weapon', type: 'sword', faction: 'the-crimson-ordas', modifiers: { str: 3 }, rof: 2, capabilities: ['1h'], value: 32 },
  glaive: { id: 'glaive', name: 'Glaive', kind: 'weapon', type: 'polearm', faction: 'the-crimson-ordas', modifiers: { str: 5 }, rof: 1, charge: 2, capabilities: ['2h'], value: 66 },
  'executioners-bladestaff': { id: 'executioners-bladestaff', name: 'Executioners Bladestaff', kind: 'weapon', type: 'polearm', faction: 'the-crimson-ordas', modifiers: { str: 6 }, rof: 1, charge: 1, capabilities: ['2h'], value: 72 },
  'great-mace': { id: 'great-mace', name: 'Great Mace', kind: 'weapon', type: 'blunt', faction: 'the-crimson-ordas', modifiers: { str: 7 }, rof: 1, capabilities: ['2h'], value: 74 },
  'cactus-banger': { id: 'cactus-banger', name: 'Cactus Banger', kind: 'weapon', type: 'alchemical', faction: 'the-crimson-ordas', modifiers: { str: 1 }, rof: 1, capabilities: ['thrown', 'also-ranged', 'confusion'], value: 40 },
  'ornate-powdershot-wand': { id: 'ornate-powdershot-wand', name: 'Ornate Powdershot Wand', kind: 'weapon', type: 'alchemical', faction: 'the-crimson-ordas', modifiers: { str: 4 }, rof: 0.5, capabilities: ['also-ranged', 'pierce'], value: 74 },
  'desert-bow': { id: 'desert-bow', name: 'Desert Bow', kind: 'weapon', type: 'ranged', faction: 'the-crimson-ordas', modifiers: { str: 2 }, rof: 2, capabilities: ['pierce'], value: 40 },

  // --- Auldersmiths (race weapon set) ---
  'brightsteel-kukri': { id: 'brightsteel-kukri', name: 'Brightsteel Kukri', kind: 'weapon', type: 'dagger', faction: 'auldersmiths', modifiers: { str: 3 }, rof: 3, capabilities: ['1h'], value: 42 },
  'brightsteel-flyssa': { id: 'brightsteel-flyssa', name: 'Brightsteel Flyssa', kind: 'weapon', type: 'sword', faction: 'auldersmiths', modifiers: { str: 4 }, rof: 2, capabilities: ['1h'], value: 46 },
  'bearded-brightsteel-axe': { id: 'bearded-brightsteel-axe', name: 'Bearded Brightsteel Axe', kind: 'weapon', type: 'axe', faction: 'auldersmiths', modifiers: { str: 5 }, rof: 2, capabilities: ['1h'], value: 48 },
  'brightsteel-greatsword': { id: 'brightsteel-greatsword', name: 'Brightsteel Greatsword', kind: 'weapon', type: 'sword', faction: 'auldersmiths', modifiers: { str: 6 }, rof: 1, capabilities: ['2h'], value: 92 },
  'brightsteel-warhammer': { id: 'brightsteel-warhammer', name: 'Brightsteel Warhammer', kind: 'weapon', type: 'blunt', faction: 'auldersmiths', modifiers: { str: 7 }, rof: 1, capabilities: ['2h'], value: 94 },
  'brightsteel-bardiche': { id: 'brightsteel-bardiche', name: 'Brightsteel Bardiche', kind: 'weapon', type: 'polearm', faction: 'auldersmiths', modifiers: { str: 6 }, rof: 1, charge: 1, capabilities: ['2h'], value: 90 },
  'powdershot-cannon': { id: 'powdershot-cannon', name: 'Powdershot Cannon', kind: 'weapon', type: 'alchemical', faction: 'auldersmiths', modifiers: { str: 7 }, rof: 0.5, capabilities: ['also-ranged', 'blowback'], value: 100 },
  'auldersmith-crossbow': { id: 'auldersmith-crossbow', name: 'Auldersmith Crossbow', kind: 'weapon', type: 'ranged', faction: 'auldersmiths', modifiers: { str: 5 }, rof: 1, capabilities: ['pierce'], value: 85 },
}
