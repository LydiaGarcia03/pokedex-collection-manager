/**
 * collect-tcg-japanese.mjs
 *
 * Adds Japan-exclusive Pokémon cards (cards whose art never came out in English) to
 * public/data/tcg-cards.json, downloads their images and adds their set names to tcg-sets.json.
 *
 * Most Japanese cards are later reprinted in English under another set id, and those are already
 * in the catalog. A Japanese card counts as exclusive when no English card of the same Pokémon has
 * the same illustrator and the same HP (the same art always shares both). Cards without an
 * illustrator are only kept when no English card of that Pokémon has the same HP at all.
 *
 * Japanese cards are stored with:
 *   - id "ja-{TCGdex id}" and setId "ja-{TCGdex set id}" (Japanese ids are a separate namespace)
 *   - their Japanese name and set name as-is, plus lang: "ja"
 *   - form: "alola" | "galar" | "hisui" | "paldea" | "mega" | "mega-x" | "mega-y" | "primal" | "gmax"
 *     when the card is of one of those forms (the app can't read it from a Japanese name)
 * Images come from TCGdex or, when it has none, from the official Japanese card database
 * (pokemon-card.com), matched by exact name + set + number. Cards found in neither are skipped.
 * Official-site images are large JPEGs (~350KB), so they're resized with sharp to the TCGdex
 * "low" size (245px wide) and saved as real WebP (~25KB).
 *
 * Additive like the rest of the TCG pipeline: no card or image already in the catalog is removed.
 * TCGdex answers are cached in scripts/.cache/ (gitignored), so a re-run only fetches new cards.
 *
 * Run from the pokedex-static root (after npm run compile-data and npm run collect-tcg):
 *   node scripts/collect-tcg-japanese.mjs            # collect, download images, write files
 *   node scripts/collect-tcg-japanese.mjs --dry-run  # only report what would be added
 *
 * Sources (setup time only, nothing is fetched by the published site):
 *   - TCGdex REST (Japanese sets and cards) and GraphQL (English cards per Pokédex number)
 *   - pokemon-card.com card search + detail pages (images TCGdex doesn't have)
 *   - PokeAPI's pokemon_species_names.csv (Japanese Pokémon names, for cards without a dexId)
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname   = dirname(fileURLToPath(import.meta.url));
const DATA_DIR    = join(__dirname, '../public/data');
const TCG_IMG_DIR = join(__dirname, '../public/images/tcg');
const CACHE_DIR   = join(__dirname, '.cache');

const COMPILED_PATH = join(DATA_DIR, 'pokemon-compiled.json');
const CARDS_PATH    = join(DATA_DIR, 'tcg-cards.json');
const SETS_PATH     = join(DATA_DIR, 'tcg-sets.json');
const JA_CACHE_PATH = join(CACHE_DIR, 'tcgdex-ja-cards.json');
const EN_CACHE_PATH = join(CACHE_DIR, 'tcgdex-en-signatures.json');

const TCGDEX_JA    = 'https://api.tcgdex.net/v2/ja';
const TCGDEX_GQL   = 'https://api.tcgdex.net/v2/graphql';
const SPECIES_CSV  = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv';
const OFFICIAL_CACHE_PATH = join(CACHE_DIR, 'pokemon-card-jp-images.json');
const OFFICIAL_SITE   = 'https://www.pokemon-card.com';
const BROWSER_HEADERS = { 'User-Agent': 'Mozilla/5.0' };
const JA_LANG_IDS  = new Set(['1', '11']); // ja-Hrkt (kana) and ja
const CONCURRENCY  = 6;
const MIN_IMAGE_BYTES = 1024;
const CARD_WIDTH      = 245; // TCGdex "low" images are 245×342

const DRY_RUN = process.argv.includes('--dry-run');

for (const path of [COMPILED_PATH, CARDS_PATH]) {
    if (!existsSync(path)) {
        console.error(`ERROR: ${path} not found. Run npm run compile-data and npm run collect-tcg first.`);
        process.exit(1);
    }
}
mkdirSync(CACHE_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : fallback);

async function fetchJson(url, init) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
            if (res.ok) return await res.json();
            if (res.status === 404) return null;
        } catch {
            // retry
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
    return null;
}

async function mapLimit(items, limit, fn, label) {
    const results = new Array(items.length);
    let next = 0;
    let done = 0;
    async function worker() {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i], i);
            if (label && (++done % 50 === 0 || done === items.length)) {
                process.stdout.write(`\r${label}: ${done}/${items.length}   `);
            }
        }
    }
    await Promise.all(Array.from({ length: limit }, worker));
    if (label) process.stdout.write('\n');
    return results;
}

// The official Japanese card database: search by exact card name, keep the hits whose image sits in
// the folder of the card's set (TCGdex and the site share set codes, e.g. "SV-P", "M6"), and take
// the one whose detail page shows the card's number.
async function searchOfficial(name, resultsByName) {
    if (!resultsByName.has(name)) {
        resultsByName.set(name, (async () => {
            const hits = [];
            for (let page = 1; ; page++) {
                const params = new URLSearchParams({ keyword: name, regulation_sidebar_form: 'all', pg: '', page: String(page), sm_and_keyword: 'true' });
                const json = await fetchJson(`${OFFICIAL_SITE}/card-search/resultAPI.php?${params}`, { headers: BROWSER_HEADERS });
                hits.push(...(json?.cardList ?? []));
                if (!json || page >= (json.maxPage ?? 1)) break;
            }
            return hits.filter(hit => hit.cardNameAltText === name);
        })());
    }
    return resultsByName.get(name);
}

async function officialNumber(cardId) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(`${OFFICIAL_SITE}/card-search/details.php/card/${cardId}/regu/all`,
                { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(20_000) });
            if (!res.ok) return null;
            // <img … class="img-regulation" alt="SV11W" />&nbsp;147&nbsp;/&nbsp;086
            const match = (await res.text()).match(/class="img-regulation"[^>]*>\s*(?:&nbsp;)*\s*(\d+)/);
            return match ? Number(match[1]) : null;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
    return null;
}

async function findOfficialImage(card, resultsByName) {
    const setFolder = `/${card.setId.toLowerCase()}/`;
    const inSet = (await searchOfficial(card.name, resultsByName))
        .filter(hit => hit.cardThumbFile.toLowerCase().includes(setFolder));
    for (const hit of inSet) {
        if (await officialNumber(hit.cardID) === Number(card.localId)) return `${OFFICIAL_SITE}${hit.cardThumbFile}`;
    }
    return null;
}

const normIllustrator = value => (value ?? '').toLowerCase().replace(/^illus\.?\s*/, '').replace(/[^a-z0-9぀-ヿ一-龯]/g, '');
const signature = (dex, illustrator, hp) => `${dex}|${normIllustrator(illustrator)}|${hp ?? ''}`;
const hpSignature = (dex, hp) => `${dex}||${hp ?? ''}`;

// ---------------------------------------------------------------------------
// Pokémon: dex number → catalog key (English name, lowercase) and Japanese name
// ---------------------------------------------------------------------------
const allPokemon = readJson(COMPILED_PATH, []);
const keyByDex = new Map();
for (const p of allPokemon) if (!keyByDex.has(p.dexNumber)) keyByDex.set(p.dexNumber, p.name.toLowerCase());

console.log('Loading Japanese Pokémon names (PokeAPI)…');
const csvRes = await fetch(SPECIES_CSV, { signal: AbortSignal.timeout(30_000) });
if (!csvRes.ok) {
    console.error(`ERROR: could not load ${SPECIES_CSV} (HTTP ${csvRes.status}).`);
    process.exit(1);
}
const jaNamesByDex = new Map(); // dex → Set of Japanese names
for (const line of (await csvRes.text()).split('\n').slice(1)) {
    const [speciesId, langId, name] = line.split(',');
    if (!JA_LANG_IDS.has(langId) || !name) continue;
    const dex = Number(speciesId);
    if (!keyByDex.has(dex)) continue;
    if (!jaNamesByDex.has(dex)) jaNamesByDex.set(dex, new Set());
    jaNamesByDex.get(dex).add(name.trim());
}
// Longest names first, so "ミュウツー" (Mewtwo) wins over "ミュウ" (Mew).
const jaNameIndex = [...jaNamesByDex].flatMap(([dex, names]) => [...names].map(name => ({ dex, name })))
    .sort((a, b) => b.name.length - a.name.length);

// Where the species name sits inside a Japanese card name, so the text around it gives the form.
function locateSpecies(cardName, dexIds) {
    const candidates = dexIds?.length ? jaNameIndex.filter(entry => dexIds.includes(entry.dex)) : jaNameIndex;
    for (const entry of candidates) {
        const index = cardName.indexOf(entry.name);
        if (index >= 0) return { ...entry, index };
    }
    return null;
}

function formOf(cardName, located) {
    const prefix = cardName.slice(0, located.index);
    const suffix = cardName.slice(located.index + located.name.length);
    if (prefix.includes('アローラ')) return 'alola';
    if (prefix.includes('ガラル')) return 'galar';
    if (prefix.includes('ヒスイ')) return 'hisui';
    if (prefix.includes('パルデア')) return 'paldea';
    if (prefix.includes('ゲンシ')) return 'primal';
    if (prefix.includes('メガ') || /^M\s?$/.test(prefix)) {
        if (/^X/.test(suffix)) return 'mega-x';
        if (/^Y/.test(suffix)) return 'mega-y';
        return 'mega';
    }
    if (suffix.includes('VMAX')) return 'gmax';
    return null;
}

// ---------------------------------------------------------------------------
// English signatures: (dex, illustrator, HP) of every English card, per Pokédex number
// ---------------------------------------------------------------------------
const enCache = readJson(EN_CACHE_PATH, {}); // { dex: [signature, ...] }
const dexNumbers = [...keyByDex.keys()].sort((a, b) => a - b);
const missingDex = dexNumbers.filter(dex => !enCache[dex]);
if (missingDex.length > 0) {
    await mapLimit(missingDex, CONCURRENCY, async dex => {
        const body = JSON.stringify({ query: `{ cards(filters:{dexId:${dex}}) { illustrator hp dexId } }` });
        const json = await fetchJson(TCGDEX_GQL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        const cards = json?.data?.cards;
        if (!Array.isArray(cards)) return;
        const signatures = new Set();
        for (const card of cards) {
            if (!(card.dexId ?? []).includes(dex)) continue;
            signatures.add(signature(dex, card.illustrator, card.hp));
            signatures.add(hpSignature(dex, card.hp));
        }
        enCache[dex] = [...signatures];
    }, 'English cards per Pokémon');
    writeFileSync(EN_CACHE_PATH, JSON.stringify(enCache), 'utf-8');
}
const englishSignatures = new Set(Object.values(enCache).flat());
const failedDex = dexNumbers.filter(dex => !enCache[dex]);
if (failedDex.length > 0) {
    // Without English data for a Pokémon every Japanese card of it would look exclusive.
    console.warn(`Warning: no English data for ${failedDex.length} Pokémon; their Japanese cards are skipped this run.`);
}

// ---------------------------------------------------------------------------
// Japanese cards: every set, then each card's details (cached)
// ---------------------------------------------------------------------------
const jaSets = await fetchJson(`${TCGDEX_JA}/sets`);
if (!Array.isArray(jaSets)) {
    console.error('ERROR: could not load the Japanese set list from TCGdex.');
    process.exit(1);
}
const setDetails = await mapLimit(jaSets, CONCURRENCY, set => fetchJson(`${TCGDEX_JA}/sets/${encodeURIComponent(set.id)}`), 'Japanese sets');

const jaCache = readJson(JA_CACHE_PATH, {}); // { cardId: { name, category, illustrator, hp, dexId, image, localId, setId } }
const briefs = setDetails.flatMap(set => (set?.cards ?? []).map(card => ({ ...card, setId: set.id })));
const toFetch = briefs.filter(card => !jaCache[card.id]);
let fetchedSinceSave = 0;
await mapLimit(toFetch, CONCURRENCY, async brief => {
    const card = await fetchJson(`${TCGDEX_JA}/cards/${encodeURIComponent(brief.id)}`);
    if (!card) return;
    jaCache[brief.id] = {
        name: card.name, category: card.category, illustrator: card.illustrator ?? null, hp: card.hp ?? null,
        dexId: card.dexId ?? null, image: card.image ?? brief.image ?? null, localId: card.localId ?? brief.localId ?? null,
        setId: brief.setId,
    };
    if (++fetchedSinceSave >= 500) {
        writeFileSync(JA_CACHE_PATH, JSON.stringify(jaCache), 'utf-8');
        fetchedSinceSave = 0;
    }
}, 'Japanese card details');
writeFileSync(JA_CACHE_PATH, JSON.stringify(jaCache), 'utf-8');

// ---------------------------------------------------------------------------
// Pick the exclusives
// ---------------------------------------------------------------------------
const stats = { pokemonCards: 0, reprinted: 0, noImage: 0, unknownPokemon: 0, noEnglishData: 0, exclusive: 0 };
const exclusives = []; // { card, key, form }
for (const brief of briefs) {
    const card = jaCache[brief.id];
    if (!card || card.category !== 'Pokemon') continue;
    stats.pokemonCards++;

    const located = locateSpecies(card.name, card.dexId);
    const dexIds = card.dexId?.length ? card.dexId : located ? [located.dex] : [];
    const knownDex = dexIds.filter(dex => keyByDex.has(dex));
    if (knownDex.length === 0) { stats.unknownPokemon++; continue; }
    if (knownDex.some(dex => !enCache[dex])) { stats.noEnglishData++; continue; }

    const reprinted = knownDex.some(dex => card.illustrator
        ? englishSignatures.has(signature(dex, card.illustrator, card.hp))
        : englishSignatures.has(hpSignature(dex, card.hp)));
    if (reprinted) { stats.reprinted++; continue; }

    stats.exclusive++;
    const form = located ? formOf(card.name, located) : null;
    for (const dex of knownDex) exclusives.push({ id: brief.id, card, key: keyByDex.get(dex), form });
}

// ---------------------------------------------------------------------------
// Image source: TCGdex, or else the official Japanese card database (pokemon-card.com)
// ---------------------------------------------------------------------------
const officialCache = readJson(OFFICIAL_CACHE_PATH, {}); // { TCGdex card id: image URL } (hits only)
const withoutTcgdexImage = [...new Map(exclusives.filter(e => !e.card.image).map(e => [e.id, e.card])).entries()]
    .filter(([id]) => !officialCache[id]);
if (withoutTcgdexImage.length > 0) {
    const resultsByName = new Map(); // one search per card name
    await mapLimit(withoutTcgdexImage, 3, async ([id, card]) => {
        const url = await findOfficialImage(card, resultsByName);
        if (url) officialCache[id] = url;
    }, 'Official Japanese site');
    writeFileSync(OFFICIAL_CACHE_PATH, JSON.stringify(officialCache), 'utf-8');
}
const imageSourceOf = id => (jaCache[id].image ? `${jaCache[id].image}/low.webp` : officialCache[id] ?? null);

const uniqueExclusiveIds = [...new Set(exclusives.map(e => e.id))];
const fromTcgdex = uniqueExclusiveIds.filter(id => jaCache[id].image).length;
const fromOfficial = uniqueExclusiveIds.filter(id => !jaCache[id].image && officialCache[id]).length;
stats.noImage = uniqueExclusiveIds.length - fromTcgdex - fromOfficial;

console.log('\nJapanese Pokémon cards:', stats.pokemonCards);
console.log(`  already in English (same illustrator + HP): ${stats.reprinted}`);
console.log(`  Pokémon not identified:                     ${stats.unknownPokemon}`);
console.log(`  skipped, no English data this run:          ${stats.noEnglishData}`);
console.log(`  Japan-exclusive:                            ${stats.exclusive}`);
console.log(`    image from TCGdex:                        ${fromTcgdex}`);
console.log(`    image from pokemon-card.com:              ${fromOfficial}`);
console.log(`    no image anywhere (skipped):              ${stats.noImage}`);

if (DRY_RUN) {
    const bySet = {};
    for (const { id, card } of exclusives) if (imageSourceOf(id)) bySet[card.setId] = (bySet[card.setId] ?? 0) + 1;
    const top = Object.entries(bySet).sort((a, b) => b[1] - a[1]).slice(0, 25);
    console.log('\nTop sets by exclusive cards:');
    for (const [setId, count] of top) console.log(`  ${setId.padEnd(10)} ${String(count).padStart(4)}  ${jaSets.find(s => s.id === setId)?.name ?? ''}`);
    console.log('\nDry run: nothing written or downloaded.');
    process.exit(0);
}

// ---------------------------------------------------------------------------
// Download images, then merge into the catalog
// ---------------------------------------------------------------------------
const uniqueIds = uniqueExclusiveIds.filter(imageSourceOf);
let downloadedBytes = 0;
const imageOk = new Set();
await mapLimit(uniqueIds, CONCURRENCY, async id => {
    const localId = `ja-${id}`;
    const file = join(TCG_IMG_DIR, localId, 'low.webp');
    if (existsSync(file)) { imageOk.add(id); return; }
    try {
        const res = await fetch(imageSourceOf(id), { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(30_000) });
        if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return;
        let buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < MIN_IMAGE_BYTES) return;
        if (!jaCache[id].image) buf = await sharp(buf).resize({ width: CARD_WIDTH }).webp({ quality: 82 }).toBuffer();
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, buf);
        downloadedBytes += buf.length;
        imageOk.add(id);
    } catch {
        // left out of the catalog this run; a re-run tries again
    }
}, 'Images');

const catalog = readJson(CARDS_PATH, {});
let added = 0;
for (const { id, card, key, form } of exclusives) {
    if (!imageOk.has(id)) continue;
    const entry = {
        id: `ja-${id}`,
        name: card.name,
        number: card.localId,
        imageUrl: `/images/tcg/ja-${id}/low.webp`,
        setId: `ja-${card.setId}`,
        lang: 'ja',
        ...(form ? { form } : {}),
    };
    const cards = catalog[key] ?? (catalog[key] = []);
    const existing = cards.findIndex(c => c.id === entry.id);
    if (existing >= 0) cards[existing] = { ...cards[existing], ...entry };
    else { cards.push(entry); added++; }
}
writeFileSync(CARDS_PATH, JSON.stringify(catalog, null, 0), 'utf-8');

const setNames = readJson(SETS_PATH, {});
for (const set of jaSets) {
    if (exclusives.some(e => e.card.setId === set.id && imageOk.has(e.id))) setNames[`ja-${set.id}`] = set.name;
}
const sortedSets = Object.fromEntries(Object.entries(setNames).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(SETS_PATH, JSON.stringify(sortedSets, null, 0), 'utf-8');

const missingImages = uniqueIds.length - imageOk.size;
console.log(`\nAdded ${added} Japanese card entries (${imageOk.size} cards with an image on disk${missingImages ? `, ${missingImages} image downloads failed — re-run to retry` : ''}).`);
console.log(`Downloaded ${(downloadedBytes / 1024 / 1024).toFixed(1)} MB of images this run.`);
const tcgBytes = (function sizeOf(dir) {
    let total = 0;
    for (const name of readdirSafe(dir)) {
        const path = join(dir, name);
        const stat = statSync(path);
        total += stat.isDirectory() ? sizeOf(path) : stat.size;
    }
    return total;
})(TCG_IMG_DIR);
console.log(`public/images/tcg is now ${(tcgBytes / 1024 / 1024).toFixed(0)} MB.`);

function readdirSafe(dir) {
    try {
        return readdirSync(dir);
    } catch {
        return [];
    }
}
