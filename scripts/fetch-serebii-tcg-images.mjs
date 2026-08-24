/**
 * fetch-serebii-tcg-images.mjs
 *
 * TCGdex hasn't uploaded images for every card it knows about — new sets and promos in
 * particular can go weeks/months without an `image` field (see collect-tcg-data.mjs, which
 * keeps these as `imageUrl: null` instead of dropping them). This script tries to fill those
 * gaps from Serebii's card database, which tends to have images for new releases faster.
 *
 * How matching works:
 *   Serebii has one page per Pokémon listing every card it's ever appeared on:
 *     https://www.serebii.net/card/dex/{dexNumber}.shtml
 *   Each row gives a set slug + display name, a card number, and a full-res image URL
 *   (https://www.serebii.net/card/{slug}/{number}.jpg — NOT the /th/ thumbnail, which is a
 *   much smaller crop of the same image).
 *
 *   For each TCGdex card missing an image, we fetch its Pokémon's Serebii page (once per
 *   Pokémon, cached across that Pokémon's cards) and look for a row whose set name matches
 *   TCGdex's set name (normalized — TCGdex's promo sets are named e.g. "SVP Black Star
 *   Promos", Serebii calls the same thing "SV Promos", so promo families use a small manual
 *   translation table; regular numbered sets match directly after normalizing) AND whose card
 *   number matches (after stripping leading zeros). This is enough to disambiguate reliably —
 *   verified by hand against Pikachu/Charizard's actual TCGdex-missing cards before writing
 *   this script.
 *
 *   Best-effort by design (see delivery plan) — niche sets Serebii names very differently from
 *   TCGdex (McDonald's Collections, Trainer's Kits, ...) may not match. Unmatched cards keep
 *   `imageUrl: null` and fall back to the placeholder UI already in PokemonTcgTab.tsx.
 *
 * Run from the pokedex-static root:
 *   node scripts/fetch-serebii-tcg-images.mjs [--dry-run]
 *
 *   --dry-run   Only print match statistics — no writes to tcg-cards.json or the download
 *               manifest, no image downloads. Use this to check match quality before
 *               committing to a run.
 *
 * Prerequisites: npm run collect-tcg must have run first (produces tcg-cards.json with
 * imageUrl: null entries for this script to resolve).
 *
 * Output (non-dry-run):
 *   - Updates public/data/tcg-cards.json in place: matched cards get a local imageUrl.
 *   - Adds matched cards to public/data/tcg-download-manifest.json (gitignored) so the next
 *     `npm run download-images` fetches them into public/images/tcg/{cardId}/low.webp — same
 *     path scheme as TCGdex-sourced images, so the frontend needs no changes.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '../public/data');

const COMPILED_PATH = join(DATA_DIR, 'pokemon-compiled.json');
const CARDS_PATH    = join(DATA_DIR, 'tcg-cards.json');
const MANIFEST_PATH = join(DATA_DIR, 'tcg-download-manifest.json');

const TCGDEX_SETS_URL = 'https://api.tcgdex.net/v2/en/sets';
const SEREBII_DEX_URL = dex => `https://www.serebii.net/card/dex/${dex}.shtml`;
const PAGE_DELAY_MS   = 400;

const DRY_RUN = process.argv.includes('--dry-run');

for (const p of [COMPILED_PATH, CARDS_PATH]) {
    if (!existsSync(p)) {
        console.error(`ERROR: ${p} not found. Run \`npm run compile-data\` and \`npm run collect-tcg\` first.`);
        process.exit(1);
    }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// TCGdex setId -> Serebii's display name for that set, where they differ enough that plain
// normalization wouldn't connect them. Only the promo families that have actually shown up in
// missing-image cards during development — TCGdex names every promo set "{ERA}P Black Star
// Promos" (e.g. "SVP Black Star Promos"), Serebii calls the English ones "{ERA} Promos".
// Every other set (the vast majority — all regular numbered sets) is matched directly by
// normalizing both TCGdex's and Serebii's set name and comparing.
// ---------------------------------------------------------------------------
const PROMO_SET_NAME_OVERRIDES = {
    mep:   'Mega Promos',
    svp:   'SV Promos',
    smp:   'SM Promos',
    swshp: 'SWSH Promos',
    xyp:   'XY Promos',
    bwp:   'BW Promos',
    dpp:   'DP Promos',
    hgssp: 'HGSS Promos',
    np:    'Nintendo Promos',
    wp:    'W Promos',
    basep: 'Wizards Black Star Promos',
    miscp: 'Miscellaneous Promos',
};

function normalizeSetName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeCardNumber(raw) {
    if (!raw) return null;
    const m = String(raw).trim().match(/^([A-Za-z]*)0*(\d+)$/);
    if (!m) return String(raw).toUpperCase();
    return `${m[1].toUpperCase()}${parseInt(m[2], 10)}`;
}

function normalizeWhitespace(str) {
    return str.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------
const allPokemon  = JSON.parse(readFileSync(COMPILED_PATH, 'utf-8'));
const cardCatalog = JSON.parse(readFileSync(CARDS_PATH, 'utf-8'));
const manifest    = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) : {};

// Base dex number per Pokémon name (lowercase) — first match wins, same species across forms
// share one Serebii card-dex page anyway.
const dexByName = new Map();
for (const p of allPokemon) {
    const key = p.name.toLowerCase();
    if (!dexByName.has(key)) dexByName.set(key, p.dexNumber);
}

console.log('Fetching TCGdex set catalog...');
const tcgdexSets = await (await fetch(TCGDEX_SETS_URL)).json();
const setNameById = new Map(tcgdexSets.map(s => [s.id, s.name]));

function serebiiSetNameFor(setId) {
    return PROMO_SET_NAME_OVERRIDES[setId] ?? setNameById.get(setId) ?? setId;
}

// ---------------------------------------------------------------------------
// Collect cards missing an image, grouped by Pokémon name
// ---------------------------------------------------------------------------
const missingByName = new Map(); // nameLower -> [{ id, name, number, setId }, ...]
let totalMissing = 0;
for (const [nameLower, cards] of Object.entries(cardCatalog)) {
    const missing = cards.filter(c => !c.imageUrl);
    if (missing.length > 0) {
        missingByName.set(nameLower, missing);
        totalMissing += missing.length;
    }
}
console.log(`${totalMissing} cards missing an image, across ${missingByName.size} Pokémon.\n`);

// ---------------------------------------------------------------------------
// Serebii page fetch + row parsing
// ---------------------------------------------------------------------------
// Card numbers in the URL path are usually plain digits ("004") but "Trainer Gallery"/"Galarian
// Gallery"/other secret-rare subsets use an alphanumeric path number ("H1") — hence [A-Za-z0-9]+
// rather than \d+. The thumbnail's number (2nd capture group) is always lowercase in the URL,
// even when the sibling detail-page href uses uppercase (H1.shtml vs th/.../h1.jpg) — use the
// thumbnail's for building the full-res image URL below.
const ROW_RE = /<a href="\/card\/([a-z0-9]+)\/[A-Za-z0-9]+\.shtml"><img src="\/card\/th\/[a-z0-9]+\/([A-Za-z0-9]+)\.jpg"[^>]*><\/a><\/td>\s*<td[^>]*><a href="\/card\/[a-z0-9]+\/[A-Za-z0-9]+\.shtml">([^<]*)<font size="2">([^<]+)<\/font>([^<]*)<\/a><\/td>\s*<td[^>]*><a href="\/card\/[a-z0-9]+\/">([^<]+)<\/a><br \/>([^\s<]+)/g;

// Local-only page cache for iterating on the matching logic without re-hitting Serebii for
// every tweak — set SEREBII_CACHE_DIR to enable (not used by a normal run).
const CACHE_DIR = process.env.SEREBII_CACHE_DIR;
if (CACHE_DIR) mkdirSync(CACHE_DIR, { recursive: true });

let lastFetchWasCached = false;

async function fetchSerebiiRows(dexNumber) {
    const padded = String(dexNumber).padStart(3, '0');
    const cachePath = CACHE_DIR ? join(CACHE_DIR, `${padded}.html`) : null;

    let html;
    if (cachePath && existsSync(cachePath)) {
        html = readFileSync(cachePath, 'utf-8');
        lastFetchWasCached = true;
    } else {
        lastFetchWasCached = false;
        const res = await fetch(SEREBII_DEX_URL(padded), { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return [];
        html = await res.text();
        if (cachePath) writeFileSync(cachePath, html, 'utf-8');
    }

    const rows = [];
    for (const m of html.matchAll(ROW_RE)) {
        const [, slug, thumbNum, namePrefix, fontName, nameSuffix, setDisplayName, numberText] = m;
        const fullNum = /^\d+$/.test(thumbNum) ? String(parseInt(thumbNum, 10)) : thumbNum.toLowerCase();
        rows.push({
            slug,
            imageUrl: `https://www.serebii.net/card/${slug}/${fullNum}.jpg`,
            cardName: normalizeWhitespace(`${namePrefix} ${fontName} ${nameSuffix}`),
            setDisplayName,
            setNameNorm: normalizeSetName(setDisplayName),
            numberNorm: normalizeCardNumber(numberText),
        });
    }
    return rows;
}

// ---------------------------------------------------------------------------
// Match
// ---------------------------------------------------------------------------
let matched = 0;
let unmatched = 0;
const unmatchedSample = [];
const matchedManifest = {}; // cardId -> Serebii full-image URL
const resolvedCardIds = new Set();
const bySet = new Map(); // setId -> { matched, unmatched, setName }

function recordSetResult(card, wasMatched) {
    const stats = bySet.get(card.setId) ?? { matched: 0, unmatched: 0, setName: serebiiSetNameFor(card.setId) };
    if (wasMatched) stats.matched++; else stats.unmatched++;
    bySet.set(card.setId, stats);
}

let done = 0;
for (const [nameLower, missingCards] of missingByName) {
    done++;
    const dexNumber = dexByName.get(nameLower);
    process.stdout.write(`\r[${done}/${missingByName.size}] ${nameLower.padEnd(24)}   `);

    if (dexNumber == null) {
        unmatched += missingCards.length;
        for (const card of missingCards) recordSetResult(card, false);
        await sleep(0);
        continue;
    }

    const rows = await fetchSerebiiRows(dexNumber);

    for (const card of missingCards) {
        const wantSetName = normalizeSetName(serebiiSetNameFor(card.setId));
        const wantNumber = normalizeCardNumber(card.number);
        const candidates = rows.filter(r =>
            r.numberNorm === wantNumber &&
            (r.setNameNorm === wantSetName || r.setNameNorm.includes(wantSetName) || wantSetName.includes(r.setNameNorm))
        );

        if (candidates.length > 0) {
            matched++;
            matchedManifest[card.id] = candidates[0].imageUrl;
            resolvedCardIds.add(card.id);
            recordSetResult(card, true);
        } else {
            unmatched++;
            recordSetResult(card, false);
            if (unmatchedSample.length < 25) {
                unmatchedSample.push(`${card.name} — ${serebiiSetNameFor(card.setId)} #${card.number} (${card.id})`);
            }
        }
    }

    await sleep(lastFetchWasCached ? 0 : PAGE_DELAY_MS);
}
process.stdout.write('\n');

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
console.log(`\nMatched:   ${matched}`);
console.log(`Unmatched: ${unmatched}`);

const setBreakdown = [...bySet.entries()]
    .map(([setId, s]) => ({ setId, ...s, total: s.matched + s.unmatched }))
    .sort((a, b) => b.unmatched - a.unmatched);
console.log(`\nBy set (worst unmatched first, top 30):`);
for (const s of setBreakdown.slice(0, 30)) {
    console.log(`  ${String(s.unmatched).padStart(4)} unmatched / ${String(s.total).padStart(4)} total — ${s.setId} (${s.setName})`);
}

if (unmatchedSample.length > 0) {
    console.log(`\nSample of unmatched cards (up to 25):`);
    for (const line of unmatchedSample) console.log(`  - ${line}`);
}

if (process.env.SEREBII_REPORT_PATH) {
    writeFileSync(process.env.SEREBII_REPORT_PATH, JSON.stringify({ matched, unmatched, setBreakdown }, null, 2), 'utf-8');
}

if (DRY_RUN) {
    console.log('\n--dry-run: no files written.');
    process.exit(0);
}

// ---------------------------------------------------------------------------
// Write updated tcg-cards.json + merged download manifest
// ---------------------------------------------------------------------------
for (const cards of Object.values(cardCatalog)) {
    for (const card of cards) {
        if (resolvedCardIds.has(card.id)) {
            card.imageUrl = `/images/tcg/${card.id}/low.webp`;
        }
    }
}

writeFileSync(CARDS_PATH, JSON.stringify(cardCatalog, null, 0), 'utf-8');
console.log(`\nUpdated ${CARDS_PATH}`);

Object.assign(manifest, matchedManifest);
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 0), 'utf-8');
console.log(`Updated ${MANIFEST_PATH} (+${Object.keys(matchedManifest).length} Serebii-sourced entries)`);

console.log('\nDone. Next step: npm run download-images');
