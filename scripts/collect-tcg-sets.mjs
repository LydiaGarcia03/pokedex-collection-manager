/**
 * collect-tcg-sets.mjs
 *
 * Writes public/data/tcg-sets.json — { setId: setName } for every set that appears in
 * tcg-cards.json — so the TCG tab can search cards by set name ("shining fates", "mcdonald").
 * tcg-cards.json itself only stores the set id.
 *
 * Names come from TCGdex's set list. Additive like the rest of the TCG pipeline: names already in
 * tcg-sets.json are kept if TCGdex stops listing a set or the request fails.
 *
 * Run from the pokedex-static root (npm run collect-tcg runs it right after collecting cards):
 *   node scripts/collect-tcg-sets.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = join(__dirname, '../public/data');
const CARDS_PATH = join(DATA_DIR, 'tcg-cards.json');
const SETS_PATH  = join(DATA_DIR, 'tcg-sets.json');

const TCGDEX_SETS_URL = 'https://api.tcgdex.net/v2/en/sets';

const cardCatalog = JSON.parse(readFileSync(CARDS_PATH, 'utf-8'));
const setNames    = existsSync(SETS_PATH) ? JSON.parse(readFileSync(SETS_PATH, 'utf-8')) : {};

try {
    const res = await fetch(TCGDEX_SETS_URL, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    for (const set of await res.json()) setNames[set.id] = set.name;
} catch (e) {
    console.warn(`Could not fetch TCGdex sets (${e.message}) — keeping the names already stored.`);
}

const usedSetIds = new Set(Object.values(cardCatalog).flat().map(c => c.setId).filter(Boolean));
const result = {};
for (const id of [...usedSetIds].sort()) {
    if (setNames[id]) result[id] = setNames[id];
}

writeFileSync(SETS_PATH, JSON.stringify(result, null, 0), 'utf-8');

const unnamed = [...usedSetIds].filter(id => !result[id]);
console.log(`Wrote tcg-sets.json (${Object.keys(result).length} sets).`);
if (unnamed.length > 0) {
    console.warn(`${unnamed.length} set id(s) without a name (search will only match their cards by name/number): ${unnamed.join(', ')}`);
}
