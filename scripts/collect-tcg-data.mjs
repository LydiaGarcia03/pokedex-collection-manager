/**
 * collect-tcg-data.mjs
 *
 * Calls the TCGdex API for every unique Pokémon name in pokemon-compiled.json
 * and builds two files:
 *
 *   public/data/tcg-cards.json
 *       The file the app reads at runtime.
 *       Format: { "bulbasaur": [{ id, name, number, imageUrl, setId }, ...], ... }
 *       imageUrl points to LOCAL files (/images/tcg/{cardId}/low.webp)
 *
 *   public/data/tcg-download-manifest.json  ← gitignored, used only by download-images.mjs
 *       Format: { "base1-44": "https://assets.tcgdex.net/en/base/base1/44/low.webp", ... }
 *
 * Run from the pokedex-static root:
 *   node scripts/collect-tcg-data.mjs
 *
 * Prerequisites: npm run compile-data must have run first.
 *
 * Duration: ~5 minutes (900 API calls × 350ms delay each).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '../public/data');

const COMPILED_PATH  = join(DATA_DIR, 'pokemon-compiled.json');
const CARDS_PATH     = join(DATA_DIR, 'tcg-cards.json');
const MANIFEST_PATH  = join(DATA_DIR, 'tcg-download-manifest.json');

const TCGDEX_BASE    = 'https://api.tcgdex.net/v2/en';
const FALLBACK_BASE  = 'https://api.na1.tcgdex.net/v2/en';
const DELAY_MS       = 350;

if (!existsSync(COMPILED_PATH)) {
    console.error('ERROR: public/data/pokemon-compiled.json not found.');
    console.error('Run `npm run compile-data` first.');
    process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithFallback(path) {
    const urls = [`${TCGDEX_BASE}${path}`, `${FALLBACK_BASE}${path}`];
    for (const url of urls) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
            if (res.ok) return await res.json();
        } catch {
            // try fallback
        }
    }
    return null;
}

function extractSetId(cardId) {
    const i = cardId.lastIndexOf('-');
    return i > 0 ? cardId.substring(0, i) : cardId;
}

// ---------------------------------------------------------------------------
// Load unique Pokémon names from compiled data
// ---------------------------------------------------------------------------
const allPokemon = JSON.parse(readFileSync(COMPILED_PATH, 'utf-8'));
const uniqueNames = [...new Set(allPokemon.map(p => p.name))].sort();
console.log(`Found ${uniqueNames.length} unique Pokémon names to query.`);

// ---------------------------------------------------------------------------
// Fetch cards for each name
// ---------------------------------------------------------------------------
const cardCatalog   = {};   // { nameLower: [TcgCard, ...] }
const downloadManifest = {}; // { cardId: originalLowUrl }

let done = 0;
let totalCards = 0;
let errors = 0;

for (const name of uniqueNames) {
    const key = name.toLowerCase();
    const path = `/cards?name=${encodeURIComponent(name)}`;

    const briefCards = await fetchWithFallback(path);

    if (!briefCards || !Array.isArray(briefCards)) {
        errors++;
        process.stdout.write(`\r[${++done}/${uniqueNames.length}] ${name.padEnd(20)} — no data   `);
        await sleep(DELAY_MS);
        continue;
    }

    const cards = briefCards
        .filter(c => c.image)   // skip entries without an image URL
        .map(c => {
            const localUrl = `/images/tcg/${c.id}/low.webp`;
            const srcUrl   = `${c.image}/low.webp`;

            downloadManifest[c.id] = srcUrl;

            return {
                id:       c.id,
                name:     c.name,
                number:   c.localId ?? null,
                imageUrl: localUrl,
                setId:    extractSetId(c.id),
            };
        });

    if (cards.length > 0) {
        cardCatalog[key] = cards;
        totalCards += cards.length;
    }

    process.stdout.write(`\r[${++done}/${uniqueNames.length}] ${name.padEnd(20)} — ${cards.length} cards   `);
    await sleep(DELAY_MS);
}

process.stdout.write('\n');

// ---------------------------------------------------------------------------
// Write outputs
// ---------------------------------------------------------------------------
writeFileSync(CARDS_PATH, JSON.stringify(cardCatalog, null, 0), 'utf-8');
console.log(`\nWrote tcg-cards.json  (${Object.keys(cardCatalog).length} Pokémon, ${totalCards} cards total)`);

writeFileSync(MANIFEST_PATH, JSON.stringify(downloadManifest, null, 0), 'utf-8');
console.log(`Wrote tcg-download-manifest.json  (${Object.keys(downloadManifest).length} unique cards to download)`);

if (errors > 0) {
    console.warn(`\nWarning: ${errors} name(s) returned no data from TCGdex.`);
}

console.log('\nDone. Next step: npm run download-images');
