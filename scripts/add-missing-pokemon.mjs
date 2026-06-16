/**
 * add-missing-pokemon.mjs
 *
 * Adds 45 missing Pokémon entries (39 Megas + 6 other forms) to the source
 * pokedex.json. Also updates 3 Tatsugiri base entries with megaEvolutions.
 *
 * Run from pokedex-static root:
 *   node scripts/add-missing-pokemon.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POKEDEX_PATH = join(__dirname, '../../pokedex/src/main/resources/data/pokedex.json');

const pokedex = JSON.parse(readFileSync(POKEDEX_PATH, 'utf-8'));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function base(id) {
  const p = pokedex.find(x => x.id === id);
  if (!p) throw new Error(`Base entry not found: ${id}`);
  return p;
}

function entry(id, dexNum, name, formName, types, abilities, opts = {}) {
  const b = base(opts.baseId ?? id.replace(/-.*$/, String(dexNum).padStart(4, '0')));
  return {
    id,
    dexNumber: dexNum,
    dexNumberFormatted: String(dexNum).padStart(4, '0'),
    name,
    formName,
    imageCode: id,
    types,
    sortOrder: 0, // will be reassigned at the end
    region: opts.region ?? b.region,
    abilities,
    moves: opts.moves ?? [],
    previousEvolution: opts.previousEvolution !== undefined ? opts.previousEvolution : b.previousEvolution,
    nextEvolution: null,
    legendary: opts.legendary !== undefined ? opts.legendary : b.legendary,
    mythical: opts.mythical !== undefined ? opts.mythical : b.mythical,
    fullyEvolved: true,
    capableOfMegaEvolution: opts.capableOfMegaEvolution ?? (id.includes('mega')),
    megaEvolutions: opts.megaEvolutions ?? b.megaEvolutions ?? [],
  };
}

// ---------------------------------------------------------------------------
// New entries to add
// Data confirmed from PokéPC CDN (type1/type2 fields) + source pokedex.json
// ---------------------------------------------------------------------------

// Insert anchor: insert AFTER the last existing entry with this dexNumber.
// For dex numbers without a pre-existing form, insert after last entry with dexNumber < target.

const newEntries = [
  // --- Raichu Mega X / Y (#26) ---
  entry('0026-mega-x', 26, 'Raichu', 'Mega Form X',
    ['ELECTRIC'], ['static', 'lightning-rod'],
    { baseId: '0026', megaEvolutions: base('0026').megaEvolutions }),

  entry('0026-mega-y', 26, 'Raichu', 'Mega Form Y',
    ['ELECTRIC'], ['static', 'lightning-rod'],
    { baseId: '0026', megaEvolutions: base('0026').megaEvolutions }),

  // --- Clefable Mega (#36) ---
  entry('0036-mega', 36, 'Clefable', 'Mega Form',
    ['FAIRY', 'FLYING'], ['magic-bounce'],
    { baseId: '0036', megaEvolutions: base('0036').megaEvolutions }),

  // --- Starmie Mega (#121) ---
  entry('0121-mega', 121, 'Starmie', 'Mega Form',
    ['WATER', 'PSYCHIC'], ['huge-power'],
    { baseId: '0121', megaEvolutions: base('0121').megaEvolutions }),

  // --- Meganium Mega (#154) ---
  entry('0154-mega', 154, 'Meganium', 'Mega Form',
    ['GRASS', 'FAIRY'], ['megasol'],
    { baseId: '0154', megaEvolutions: base('0154').megaEvolutions }),

  // --- Feraligatr Mega (#160) ---
  entry('0160-mega', 160, 'Feraligatr', 'Mega Form',
    ['WATER', 'DRAGON'], ['dragonize'],
    { baseId: '0160', megaEvolutions: base('0160').megaEvolutions }),

  // --- Cherrim Sunshine (#421) ---
  entry('0421-sunshine', 421, 'Cherrim', 'Sunshine Form',
    ['GRASS'], ['flower-gift'],
    { baseId: '0421', capableOfMegaEvolution: false, megaEvolutions: [] }),

  // --- Skarmory Mega (#227) ---
  entry('0227-mega', 227, 'Skarmory', 'Mega Form',
    ['STEEL', 'FLYING'], ['stalwart'],
    { baseId: '0227', megaEvolutions: base('0227').megaEvolutions }),

  // --- Chimecho Mega (#358) ---
  entry('0358-mega', 358, 'Chimecho', 'Mega Form',
    ['PSYCHIC', 'STEEL'], ['levitate'],
    { baseId: '0358', megaEvolutions: base('0358').megaEvolutions }),

  // --- Absol Mega Z (#359) ---
  entry('0359-mega-z', 359, 'Absol', 'Mega Form Z',
    ['DARK', 'GHOST'], ['pressure', 'super-luck', 'justified'],
    { baseId: '0359', megaEvolutions: base('0359').megaEvolutions }),

  // --- Staraptor Mega (#398) ---
  entry('0398-mega', 398, 'Staraptor', 'Mega Form',
    ['FIGHTING', 'FLYING'], ['intimidate', 'reckless'],
    { baseId: '0398', megaEvolutions: base('0398').megaEvolutions }),

  // --- Garchomp Mega Z (#445) ---
  entry('0445-mega-z', 445, 'Garchomp', 'Mega Form Z',
    ['DRAGON'], ['sand-veil', 'rough-skin'],
    { baseId: '0445', megaEvolutions: base('0445').megaEvolutions }),

  // --- Lucario Mega Z (#448) ---
  entry('0448-mega-z', 448, 'Lucario', 'Mega Form Z',
    ['FIGHTING', 'STEEL'], ['steadfast', 'inner-focus', 'justified'],
    { baseId: '0448', megaEvolutions: base('0448').megaEvolutions }),

  // --- Heatran Mega (#485) ---
  entry('0485-mega', 485, 'Heatran', 'Mega Form',
    ['FIRE', 'STEEL'], ['flash-fire', 'flame-body'],
    { baseId: '0485', megaEvolutions: base('0485').megaEvolutions }),

  // --- Darkrai Mega (#491) ---
  entry('0491-mega', 491, 'Darkrai', 'Mega Form',
    ['DARK'], ['bad-dreams'],
    { baseId: '0491', megaEvolutions: base('0491').megaEvolutions }),

  // --- Shaymin Sky Forme (#492) ---
  entry('0492-sky', 492, 'Shaymin', 'Sky Forme',
    ['GRASS', 'FLYING'], ['serene-grace'],
    { baseId: '0492', capableOfMegaEvolution: false, megaEvolutions: [] }),

  // --- Emboar Mega (#500) ---
  entry('0500-mega', 500, 'Emboar', 'Mega Form',
    ['FIRE', 'FIGHTING'], ['mold-breaker'],
    { baseId: '0500', megaEvolutions: base('0500').megaEvolutions }),

  // --- Excadrill Mega (#530) ---
  entry('0530-mega', 530, 'Excadrill', 'Mega Form',
    ['GROUND', 'STEEL'], ['piercing-drill'],
    { baseId: '0530', megaEvolutions: base('0530').megaEvolutions }),

  // --- Scolipede Mega (#545) ---
  entry('0545-mega', 545, 'Scolipede', 'Mega Form',
    ['BUG', 'POISON'], ['poison-point', 'swarm', 'speed-boost'],
    { baseId: '0545', megaEvolutions: base('0545').megaEvolutions }),

  // --- Darmanitan Zen Mode (#555) ---
  entry('0555-zen', 555, 'Darmanitan', 'Zen Mode',
    ['FIRE', 'PSYCHIC'], ['zen-mode'],
    { baseId: '0555', capableOfMegaEvolution: false, megaEvolutions: [] }),

  // --- Darmanitan Galarian Zen Mode (#555) ---
  entry('0555-galar-zen', 555, 'Darmanitan', 'Galarian Zen Mode',
    ['ICE', 'FIRE'], ['zen-mode'],
    { baseId: '0555-galar-standard', capableOfMegaEvolution: false, megaEvolutions: [] }),

  // --- Scrafty Mega (#560) ---
  entry('0560-mega', 560, 'Scrafty', 'Mega Form',
    ['DARK', 'FIGHTING'], ['shed-skin', 'moxie', 'intimidate'],
    { baseId: '0560', megaEvolutions: base('0560').megaEvolutions }),

  // --- Eelektross Mega (#604) ---
  entry('0604-mega', 604, 'Eelektross', 'Mega Form',
    ['ELECTRIC'], ['levitate'],
    { baseId: '0604', megaEvolutions: base('0604').megaEvolutions }),

  // --- Chandelure Mega (#609) ---
  entry('0609-mega', 609, 'Chandelure', 'Mega Form',
    ['GHOST', 'FIRE'], ['infiltrator'],
    { baseId: '0609', megaEvolutions: base('0609').megaEvolutions }),

  // --- Golurk Mega (#623) ---
  entry('0623-mega', 623, 'Golurk', 'Mega Form',
    ['GROUND', 'GHOST'], ['unseen-fist'],
    { baseId: '0623', megaEvolutions: base('0623').megaEvolutions }),

  // --- Chesnaught Mega (#652) ---
  entry('0652-mega', 652, 'Chesnaught', 'Mega Form',
    ['GRASS', 'FIGHTING'], ['bulletproof'],
    { baseId: '0652', megaEvolutions: base('0652').megaEvolutions }),

  // --- Delphox Mega (#655) ---
  entry('0655-mega', 655, 'Delphox', 'Mega Form',
    ['FIRE', 'PSYCHIC'], ['levitate'],
    { baseId: '0655', megaEvolutions: base('0655').megaEvolutions }),

  // --- Greninja Mega (#658) ---
  entry('0658-mega', 658, 'Greninja', 'Mega Form',
    ['WATER', 'DARK'], ['protean'],
    { baseId: '0658', megaEvolutions: base('0658').megaEvolutions }),

  // --- Pyroar Mega (#668) ---
  entry('0668-mega', 668, 'Pyroar', 'Mega Form',
    ['FIRE', 'NORMAL'], ['rivalry', 'unnerve', 'moxie'],
    { baseId: '0668', megaEvolutions: base('0668').megaEvolutions }),

  // --- Floette Eternal Flower (#670) ---
  entry('0670-eternal', 670, 'Floette', 'Eternal Flower',
    ['FAIRY'], ['flower-veil', 'symbiosis'],
    {
      baseId: '0670',
      capableOfMegaEvolution: true,
      megaEvolutions: [{ item: 'floettite-eternal', megaPokemon: 'floette-eternal-mega' }],
    }),

  // --- Floette Eternal Flower Mega (#670) ---
  entry('0670-eternal-mega', 670, 'Floette', 'Eternal Flower Mega',
    ['FAIRY'], ['fairy-aura'],
    {
      baseId: '0670',
      capableOfMegaEvolution: true,
      megaEvolutions: [{ item: 'floettite-eternal', megaPokemon: 'floette-eternal-mega' }],
    }),

  // --- Meowstic Mega (#678) ---
  entry('0678-mega', 678, 'Meowstic', 'Mega Form',
    ['PSYCHIC'], ['trace'],
    { baseId: '0678', megaEvolutions: base('0678').megaEvolutions }),

  // --- Barbaracle Mega (#689) ---
  entry('0689-mega', 689, 'Barbaracle', 'Mega Form',
    ['ROCK', 'FIGHTING'], ['tough-claws', 'sniper', 'pickpocket'],
    { baseId: '0689', megaEvolutions: base('0689').megaEvolutions }),

  // --- Dragalge Mega (#691) ---
  entry('0691-mega', 691, 'Dragalge', 'Mega Form',
    ['POISON', 'DRAGON'], ['poison-point', 'poison-touch', 'adaptability'],
    { baseId: '0691', megaEvolutions: base('0691').megaEvolutions }),

  // --- Zygarde Complete Forme Mega (#718) ---
  entry('0718-complete-mega', 718, 'Zygarde', 'Complete Forme Mega',
    ['DRAGON', 'GROUND'], ['aura-break'],
    {
      baseId: '0718-complete',
      capableOfMegaEvolution: true,
      megaEvolutions: [{ item: 'zygardite-complete', megaPokemon: 'zygarde-complete-mega' }],
    }),

  // --- Crabominable Mega (#740) ---
  entry('0740-mega', 740, 'Crabominable', 'Mega Form',
    ['FIGHTING', 'ICE'], ['iron-fist'],
    { baseId: '0740', megaEvolutions: base('0740').megaEvolutions }),

  // --- Golisopod Mega (#768) ---
  entry('0768-mega', 768, 'Golisopod', 'Mega Form',
    ['BUG', 'STEEL'], ['emergency-exit'],
    { baseId: '0768', megaEvolutions: base('0768').megaEvolutions }),

  // --- Drampa Mega (#780) ---
  entry('0780-mega', 780, 'Drampa', 'Mega Form',
    ['NORMAL', 'DRAGON'], ['berserk'],
    { baseId: '0780', megaEvolutions: base('0780').megaEvolutions }),

  // --- Zeraora Mega (#807) ---
  entry('0807-mega', 807, 'Zeraora', 'Mega Form',
    ['ELECTRIC'], ['volt-absorb'],
    { baseId: '0807', megaEvolutions: base('0807').megaEvolutions }),

  // --- Falinks Mega (#870) ---
  entry('0870-mega', 870, 'Falinks', 'Mega Form',
    ['FIGHTING'], ['battle-armor', 'defiant'],
    { baseId: '0870', megaEvolutions: base('0870').megaEvolutions }),

  // --- Scovillain Mega (#952) ---
  entry('0952-mega', 952, 'Scovillain', 'Mega Form',
    ['GRASS', 'FIRE'], ['spicy-spray'],
    { baseId: '0952', megaEvolutions: base('0952').megaEvolutions }),

  // --- Glimmora Mega (#970) ---
  entry('0970-mega', 970, 'Glimmora', 'Mega Form',
    ['ROCK', 'POISON'], ['adaptability'],
    { baseId: '0970', megaEvolutions: base('0970').megaEvolutions }),

  // --- Tatsugiri Mega (#978) ---
  entry('0978-mega', 978, 'Tatsugiri', 'Mega Form',
    ['DRAGON', 'WATER'], ['commander', 'storm-drain'],
    {
      baseId: '0978',
      capableOfMegaEvolution: true,
      megaEvolutions: [{ item: 'tatsugirite', megaPokemon: 'tatsugiri-mega' }],
    }),

  // --- Baxcalibur Mega (#998) ---
  entry('0998-mega', 998, 'Baxcalibur', 'Mega Form',
    ['DRAGON', 'ICE'], ['thermal-exchange', 'ice-body'],
    { baseId: '0998', megaEvolutions: base('0998').megaEvolutions }),

  // --- Gimmighoul Roaming Form (#999) ---
  entry('0999-roaming', 999, 'Gimmighoul', 'Roaming Form',
    ['GHOST'], ['run-away'],
    { baseId: '0999', capableOfMegaEvolution: false, megaEvolutions: [] }),
];

// ---------------------------------------------------------------------------
// Update base forms that need megaEvolutions added (Tatsugiri)
// ---------------------------------------------------------------------------

const tatsugiriteMega = [{ item: 'tatsugirite', megaPokemon: 'tatsugiri-mega' }];
for (const id of ['0978', '0978-droopy', '0978-stretchy']) {
  const p = pokedex.find(x => x.id === id);
  if (p) {
    p.capableOfMegaEvolution = true;
    p.megaEvolutions = tatsugiriteMega;
    console.log(`Updated ${id}: capableOfMegaEvolution=true, megaEvolutions set`);
  }
}

// ---------------------------------------------------------------------------
// Insert each new entry after the last existing entry with the same dexNumber.
// If none exists, insert after the last entry with dexNumber < target.
// ---------------------------------------------------------------------------

function insertAfterDex(arr, newEntry) {
  const dex = newEntry.dexNumber;
  // Find last index with same dexNumber
  let lastSameDex = -1;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].dexNumber === dex) { lastSameDex = i; break; }
  }
  if (lastSameDex >= 0) {
    arr.splice(lastSameDex + 1, 0, newEntry);
    return;
  }
  // Find last index with dexNumber < target
  let lastLower = -1;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].dexNumber < dex) { lastLower = i; break; }
  }
  arr.splice(lastLower + 1, 0, newEntry);
}

// Sort new entries by dexNumber first so insertions are sequential
newEntries.sort((a, b) => a.dexNumber - b.dexNumber || a.id.localeCompare(b.id));

for (const e of newEntries) {
  if (pokedex.find(x => x.id === e.id)) {
    console.warn(`SKIP: ${e.id} already exists`);
    continue;
  }
  insertAfterDex(pokedex, e);
  console.log(`Added: ${e.id} — ${e.name} ${e.formName}`);
}

// ---------------------------------------------------------------------------
// Reassign sortOrder sequentially (1-indexed)
// ---------------------------------------------------------------------------
pokedex.forEach((p, i) => { p.sortOrder = i + 1; });

// ---------------------------------------------------------------------------
// Write back
// ---------------------------------------------------------------------------
writeFileSync(POKEDEX_PATH, JSON.stringify(pokedex, null, 2), 'utf-8');
console.log(`\nDone. pokedex.json now has ${pokedex.length} entries.`);
