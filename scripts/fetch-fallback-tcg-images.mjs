/**
 * fetch-fallback-tcg-images.mjs
 *
 * Last step of the TCG image pipeline: resolves every card still left with `imageUrl: null`
 * after collect-tcg-data.mjs (TCGdex) and fetch-serebii-tcg-images.mjs (Serebii), using free
 * sources that cover what those two miss. Tried in this order, first hit wins:
 *
 *   1. Manual images — a file already at public/images/tcg/{cardId}/low.webp for a card with no
 *      imageUrl was put there by hand (e.g. saved from Bulbagarden Archives through a browser,
 *      which blocks scripted downloads) and is adopted as-is, never overwritten.
 *      Manual overrides — scripts/tcg-image-overrides.json ({ cardId: imageUrl }), for a
 *      hand-picked URL a script can download.
 *   2. pokemon-tcg-data (https://github.com/PokemonTCG/pokemon-tcg-data, open JSON dataset) +
 *      its image CDN (images.pokemontcg.io / images.scrydex.com). Covers Shiny Vault, Trainer
 *      Gallery, Galarian Gallery, Classic Collection, black star promos, McDonald's, EX trainer
 *      kits, e-Card holo subsets. TCGdex and this dataset use different set ids, hence
 *      PTCG_SET_BY_TCGDEX_SET. Scrydex also serves cards newer than the JSON dataset (recent
 *      promos, McDonald's 2023/2024), so a direct `{set}-{number}` lookup is tried too.
 *   3. pkmncards.com set pages — XY/BW/SM/HS/DP trainer kits and a few other niche products
 *      neither TCGdex nor Serebii carry (PKMNCARDS_SET_BY_TCGDEX_SET).
 *   4. Limitless CDN — TCG Pocket sets (Promos-A, Crimson Blaze, Paldean Wonders, ...), when
 *      TCGdex lags behind on uploading their images.
 *   5. Reprints — Trainer Kit / Yellow A Alternate / Classic Collection cards are reprints with
 *      the same art as a card already in the catalog. Matched through TCGdex card details (same
 *      name, same illustrator, same attack names) and the original's local image is reused.
 *
 *   Known gap none of these cover: My First Battle and Poké Card Creator Pack are only on
 *   Bulbagarden Archives, which blocks scripted image downloads — save those by hand (source 1).
 *
 * Unlike the Serebii script, images are downloaded here directly (not queued for
 * download-images.mjs) because every candidate has to be fetched anyway to rule out 404s and
 * Scrydex's "image not found" placeholder (served with HTTP 200). A card only gets a local
 * imageUrl once its file is actually on disk. The source URL is still recorded in the download
 * manifest so the pipeline stays reproducible.
 *
 * Additive only: never removes a card or touches a card that already has an image.
 *
 * Run from the pokedex-static root (after collect-tcg and fetch-serebii-tcg):
 *   node scripts/fetch-fallback-tcg-images.mjs [--dry-run] [--only=setId,setId]
 *
 *   --dry-run   Report what would be resolved; writes nothing.
 *   --only=     Limit to cards of these TCGdex set ids.
 *
 * Output:
 *   - public/data/tcg-cards.json updated in place
 *   - public/data/tcg-download-manifest.json (gitignored) extended with the source URLs
 *   - public/images/tcg/{cardId}/low.webp for each resolved card (original bytes — PNG/JPEG
 *     served under .webp, same as the Serebii-sourced images; browsers sniff the format)
 *   - scripts/tcg-missing-images.json — whatever is still unresolved, for manual overrides
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '../public/data');
const TCG_IMG_DIR = join(__dirname, '../public/images/tcg');

const CARDS_PATH     = join(DATA_DIR, 'tcg-cards.json');
const MANIFEST_PATH  = join(DATA_DIR, 'tcg-download-manifest.json');
const OVERRIDES_PATH = join(__dirname, 'tcg-image-overrides.json');
const REPORT_PATH    = join(__dirname, 'tcg-missing-images.json');
const ERRORS_PATH    = join(DATA_DIR, 'download-errors.json');

const DRY_RUN    = process.argv.includes('--dry-run');
const ONLY_SETS  = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',');
const USER_AGENT = 'Mozilla/5.0 (compatible; pokedex-static image script)';
const DELAY_MS   = 150;

const PTCG_DATA_URL   = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en';
const SCRYDEX_URL     = (ptcgSet, number) => `https://images.scrydex.com/pokemon/${ptcgSet}-${number}/small`;
const PKMNCARDS_URL   = slug => `https://pkmncards.com/set/${slug}/`;
const LIMITLESS_URL   = (set, number) => `https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket/${set}/${set}_${number}_EN_SM.webp`;
const TCGDEX_POCKET_SERIES_URL = 'https://api.tcgdex.net/v2/en/series/tcgp';
const TCGDEX_CARD_URL = id => `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(id)}`;

// TCGdex set id -> pokemon-tcg-data set id. Only sets whose ids differ, plus sets that are
// identical but need to be opted in (an unlisted set is not looked up at all).
const PTCG_SET_BY_TCGDEX_SET = {
    'swsh4.5sv':  'swsh45sv',
    'swsh12.5gg': 'swsh12pt5gg',
    'sm3.5':      'sm35',
    'sm7.5':      'sm75',
    cel25cc:      'cel25c',
    '30th-c':     'me55c',
    '30th':       'me55',
    bog:          'bp',
    hgssp:        'hsp',
    exu:          'ex10',
    'tk-ex-latia': 'tk1a',
    'tk-ex-latio': 'tk1b',
    'tk-ex-p':    'tk2a',
    'tk-ex-m':    'tk2b',
    '2011bw':     'mcd11',
    '2012bw':     'mcd12',
    '2014xy':     'mcd14',
    '2015xy':     'mcd15',
    '2016xy':     'mcd16',
    '2017sm':     'mcd17',
    '2018sm':     'mcd18',
    '2019sm':     'mcd19',
    '2021swsh':   'mcd21',
    '2022swsh':   'mcd22',
    '2023sv':     'mcd23',
    '2024sv':     'mcd24',
};
const SAME_ID_PTCG_SETS = [
    'smp', 'svp', 'swshp', 'xyp', 'bwp', 'mep', 'ecard2', 'ecard3', 'sm6', 'pop6', 'cel25', 'pl2',
    'swsh9tg', 'swsh10tg', 'swsh11tg', 'swsh12tg',
];
for (const id of SAME_ID_PTCG_SETS) PTCG_SET_BY_TCGDEX_SET[id] ??= id;

// Classic Collection reprints keep the original card's number, so several cards share one
// number within the set — match by name instead.
const MATCH_BY_NAME_SETS = new Set(['cel25cc', '30th-c']);

const PKMNCARDS_SET_BY_TCGDEX_SET = {
    'tk-xy-p':     'xy-trainer-kit-pikachu-libre',
    'tk-xy-su':    'xy-trainer-kit-suicune',
    'tk-xy-latia': 'xy-trainer-kit-latias',
    'tk-xy-latio': 'xy-trainer-kit-latios',
    'tk-xy-w':     'xy-trainer-kit-wigglytuff',
    'tk-xy-b':     'xy-trainer-kit-bisharp',
    'tk-xy-n':     'xy-trainer-kit-noivern',
    'tk-xy-sy':    'xy-trainer-kit-sylveon',
    'tk-bw-z':     'black-white-trainer-kit-zoroark',
    'tk-bw-e':     'black-white-trainer-kit-excadrill',
    'tk-sm-r':     'sun-moon-trainer-kit-alolan-raichu',
    'tk-sm-l':     'sun-moon-trainer-kit-lycanroc',
    'tk-hs-g':     'hs-trainer-kit-gyarados',
    'tk-hs-r':     'hs-trainer-kit-raichu',
    'tk-dp-m':     'diamond-pearl-trainer-kit-manaphy',
    'tk-dp-l':     'diamond-pearl-trainer-kit-lucario',
    'tk-ex-latia': 'ex-trainer-kit-latias',
    'tk-ex-latio': 'ex-trainer-kit-latios',
    'tk-ex-p':     'ex-trainer-kit-plusle',
    'tk-ex-m':     'ex-trainer-kit-minun',
    exu:           'unseen-forces',
    '2023sv':      'mcdonalds-match-battle-2023',
    mep:           'mega-evolution-promos',
    svp:           'scarlet-violet-promos',
    swshp:         'sword-shield-promos',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));

function normalizeName(name) {
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// "SV058" -> "SV58", "007" -> "7", "H01" -> "H1"; anything non-standard (e.g. Unown "!") as-is.
function normalizeNumber(raw) {
    const s = decodeURIComponent(String(raw ?? '')).trim();
    const m = s.match(/^([A-Za-z]*)0*(\d+)([a-z]?)$/);
    return m ? `${m[1].toUpperCase()}${parseInt(m[2], 10)}${m[3]}` : s.toUpperCase();
}

function namesAgree(a, b) {
    const x = normalizeName(a), y = normalizeName(b);
    return x.includes(y) || y.includes(x);
}

async function fetchText(url) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
        return res.ok ? await res.text() : null;
    } catch {
        return null;
    }
}

// Scrydex answers unknown ids with HTTP 200 + a generic "no image" PNG, so remember its hash.
let scrydexPlaceholderHash = null;
const sha1 = buf => createHash('sha1').update(buf).digest('hex');

async function fetchImage(url) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
        if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 2_000) return null;
        if (scrydexPlaceholderHash && sha1(buf) === scrydexPlaceholderHash) return null;
        return buf;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------
const cardCatalog = JSON.parse(readFileSync(CARDS_PATH, 'utf-8'));
const manifest    = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) : {};
const overrides   = existsSync(OVERRIDES_PATH) ? JSON.parse(readFileSync(OVERRIDES_PATH, 'utf-8')) : {};
const downloadErrors = existsSync(ERRORS_PATH) ? JSON.parse(readFileSync(ERRORS_PATH, 'utf-8')) : {};

// A card whose download failed (e.g. TCGdex lists an image that 404s) points at a file that
// doesn't exist — treat it as missing too.
const needsImage = c => !c.imageUrl ||
    (downloadErrors[`tcg/${c.id}`] && !existsSync(join(TCG_IMG_DIR, c.id, 'low.webp')));

const ptcgSetCache = new Map();
async function ptcgCards(ptcgSet) {
    if (!ptcgSetCache.has(ptcgSet)) {
        const text = await fetchText(`${PTCG_DATA_URL}/${ptcgSet}.json`);
        ptcgSetCache.set(ptcgSet, text ? JSON.parse(text) : []);
    }
    return ptcgSetCache.get(ptcgSet);
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------
// The same card can sit under several Pokémon (TAG TEAM, LEGEND, ...) — resolve it once.
const missing = [...new Map(Object.values(cardCatalog).flat()
    .filter(c => needsImage(c) && (!ONLY_SETS || ONLY_SETS.includes(c.setId)))
    .map(c => [c.id, c])).values()];
console.log(`${missing.length} cards missing an image.\n`);

async function fromPtcg(card, siblings) {
    const ptcgSet = PTCG_SET_BY_TCGDEX_SET[card.setId];
    if (!ptcgSet) return null;
    const setCards = await ptcgCards(ptcgSet);

    let match;
    if (MATCH_BY_NAME_SETS.has(card.setId)) {
        // Same name twice (e.g. both halves of a LEGEND) -> pair them up in number order.
        const ours   = siblings.filter(c => normalizeName(c.name) === normalizeName(card.name))
                               .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
        const theirs = setCards.filter(pc => normalizeName(pc.name) === normalizeName(card.name));
        match = theirs[ours.findIndex(c => c.id === card.id)] ?? theirs[0];
    } else {
        const byNumber = n => setCards.find(pc => normalizeNumber(pc.number) === n && namesAgree(pc.name, card.name));
        // e-Card "74a"/"74b" are two prints of card 74 (only the e-Reader dot code differs, same
        // art) — the datasets carry a single image for both.
        match = byNumber(normalizeNumber(card.number)) ?? byNumber(normalizeNumber(card.number).replace(/[ab]$/, ''));
    }

    const urls = [];
    if (match) urls.push(match.images.small, SCRYDEX_URL(ptcgSet, match.number));
    // Not in the JSON dataset (yet) — Scrydex often has it anyway under the same id scheme.
    if (!match && !MATCH_BY_NAME_SETS.has(card.setId)) {
        const n = decodeURIComponent(String(card.number));
        urls.push(...new Set([SCRYDEX_URL(ptcgSet, normalizeNumber(n)), SCRYDEX_URL(ptcgSet, n)]));
    }

    for (const url of urls) {
        const buf = await fetchImage(url);
        await sleep(DELAY_MS);
        if (buf) return { url, buf };
    }
    return null;
}

const pkmncardsCache = new Map(); // slug -> [{ number, name, imageUrl }]
async function pkmncardsSet(slug) {
    if (pkmncardsCache.has(slug)) return pkmncardsCache.get(slug);
    const html = (await fetchText(PKMNCARDS_URL(slug))) ?? '';
    await sleep(DELAY_MS);
    const rows = [];
    // Card slugs end with "-{setCode}-{number}"; srcset carries the ~225px thumbnail.
    const re = /<a [^>]*href="https:\/\/pkmncards\.com\/card\/([^"\/]+)\/"[^>]*>\s*<img([^>]+)>/g;
    for (const [, cardSlug, attrs] of html.matchAll(re)) {
        const number = cardSlug.split('-').pop();
        const src    = attrs.match(/\ssrc="([^"]+)"/)?.[1];
        const thumb  = attrs.match(/(https:\/\/[^\s"]+)\s+225w/)?.[1];
        if (src) rows.push({ number, cardSlug, imageUrl: thumb ?? src });
    }
    // A set with a single card is rendered as that card's own page instead of a grid.
    if (rows.length === 0) {
        const cardSlug = html.match(/class="card-title"[^>]*><a href="https:\/\/pkmncards\.com\/card\/([^"\/]+)\/"/)?.[1];
        const src      = html.match(/<img[^>]+class="card-image[^>]+>/)?.[0].match(/\ssrc="([^"]+)"/)?.[1];
        if (cardSlug && src) rows.push({ number: cardSlug.split('-').pop(), cardSlug, imageUrl: src });
    }
    pkmncardsCache.set(slug, rows);
    return rows;
}

async function fromPkmncards(card) {
    const slug = PKMNCARDS_SET_BY_TCGDEX_SET[card.setId];
    if (!slug) return null;
    const rows = await pkmncardsSet(slug);
    const wantName = normalizeName(card.name);
    const row = rows.find(r =>
        normalizeNumber(r.number) === normalizeNumber(card.number) &&
        normalizeName(r.cardSlug).startsWith(wantName.slice(0, Math.min(wantName.length, 5)))
    );
    if (!row) return null;
    const buf = await fetchImage(row.imageUrl);
    await sleep(DELAY_MS);
    return buf ? { url: row.imageUrl, buf } : null;
}

let pocketSetIds = null;
async function fromLimitless(card) {
    if (!pocketSetIds) {
        const series = JSON.parse((await fetchText(TCGDEX_POCKET_SERIES_URL)) ?? '{"sets":[]}');
        pocketSetIds = new Set(series.sets.map(s => s.id));
    }
    if (!pocketSetIds.has(card.setId)) return null;
    const url = LIMITLESS_URL(card.setId, String(card.number).padStart(3, '0'));
    const buf = await fetchImage(url);
    await sleep(DELAY_MS);
    return buf ? { url, buf } : null;
}

const localImagePath = id => join(TCG_IMG_DIR, id, 'low.webp');

async function fromManualFile(card) {
    if (card.imageUrl || !existsSync(localImagePath(card.id))) return null;
    return { url: null, buf: readFileSync(localImagePath(card.id)) };
}

const tcgdexDetailCache = new Map();
async function tcgdexDetail(id) {
    if (!tcgdexDetailCache.has(id)) {
        const text = await fetchText(TCGDEX_CARD_URL(id));
        tcgdexDetailCache.set(id, text ? JSON.parse(text) : null);
    }
    return tcgdexDetailCache.get(id);
}

const attackNames = d => (d.attacks ?? []).map(a => normalizeName(a.name)).join('/');

// Candidates: cards with the same (normalized) name whose image is already on disk.
const cardsWithImageByName = new Map();
for (const c of Object.values(cardCatalog).flat()) {
    if (!c.imageUrl || !existsSync(localImagePath(c.id))) continue;
    const k = normalizeName(c.name);
    if (!cardsWithImageByName.has(k)) cardsWithImageByName.set(k, new Map());
    cardsWithImageByName.get(k).set(c.id, c);
}

async function fromReprint(card) {
    const d = await tcgdexDetail(card.id);
    if (!d?.illustrator) return null;
    for (const candidate of cardsWithImageByName.get(normalizeName(card.name))?.values() ?? []) {
        if (candidate.id === card.id) continue;
        const cd = await tcgdexDetail(candidate.id);
        if (cd?.illustrator === d.illustrator && attackNames(cd) === attackNames(d)) {
            return { url: manifest[candidate.id] ?? null, buf: readFileSync(localImagePath(candidate.id)), reprintOf: candidate.id };
        }
    }
    return null;
}

async function fromOverride(card) {
    const url = overrides[card.id];
    if (!url) return null;
    const buf = await fetchImage(url);
    return buf ? { url, buf } : null;
}

const SOURCES = [
    ['manual file',  fromManualFile],
    ['override',     fromOverride],
    ['ptcg/scrydex', fromPtcg],
    ['pkmncards',    fromPkmncards],
    ['limitless',    fromLimitless],
    ['reprint',      fromReprint],
];

// ---------------------------------------------------------------------------
// Resolve
// ---------------------------------------------------------------------------
scrydexPlaceholderHash = await (async () => {
    const res = await fetch(SCRYDEX_URL('this-set-does-not-exist', '0'), { headers: { 'User-Agent': USER_AGENT } }).catch(() => null);
    return res?.ok ? sha1(Buffer.from(await res.arrayBuffer())) : null;
})();

const siblingsBySet = new Map();
for (const c of missing) (siblingsBySet.get(c.setId) ?? siblingsBySet.set(c.setId, []).get(c.setId)).push(c);

const resolvedBySource = Object.fromEntries(SOURCES.map(([name]) => [name, 0]));
const resolved = new Map(); // cardId -> source url (null for hand-placed files)
const reprints = {};        // cardId -> id of the original card whose image was reused
let done = 0;

for (const card of missing) {
    process.stdout.write(`\r[${++done}/${missing.length}] ${card.id.padEnd(22)}`);
    for (const [name, source] of SOURCES) {
        const hit = await source(card, siblingsBySet.get(card.setId));
        if (!hit) continue;
        resolvedBySource[name]++;
        resolved.set(card.id, hit.url);
        if (hit.reprintOf) reprints[card.id] = hit.reprintOf;
        if (!DRY_RUN && name !== 'manual file') {
            const dir = join(TCG_IMG_DIR, card.id);
            mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, 'low.webp'), hit.buf);
        }
        break;
    }
}
process.stdout.write('\n');

// ---------------------------------------------------------------------------
// Report + write
// ---------------------------------------------------------------------------
const stillMissing = missing.filter(c => !resolved.has(c.id));
const missingBySet = {};
for (const c of stillMissing) (missingBySet[c.setId] ??= []).push({ id: c.id, name: c.name, number: c.number });

console.log(`\nResolved ${resolved.size} / ${missing.length}:`, resolvedBySource);
for (const [id, orig] of Object.entries(reprints)) console.log(`  reprint: ${id} <- ${orig}`);
console.log(`Still missing: ${stillMissing.length}`);
for (const [setId, cards] of Object.entries(missingBySet).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(cards.length).padStart(4)}  ${setId}`);
}

if (DRY_RUN) {
    console.log('\n--dry-run: no files written.');
    process.exit(0);
}

// Unresolved broken links fall back to null so the UI shows its placeholder, not a broken image.
for (const card of Object.values(cardCatalog).flat()) {
    if (resolved.has(card.id)) card.imageUrl = `/images/tcg/${card.id}/low.webp`;
    else if (missing.some(m => m.id === card.id)) card.imageUrl = null;
}
for (const id of resolved.keys()) delete downloadErrors[`tcg/${id}`];
writeFileSync(ERRORS_PATH, JSON.stringify(downloadErrors, null, 2), 'utf-8');
for (const [id, url] of resolved) if (url) manifest[id] = url;

writeFileSync(CARDS_PATH, JSON.stringify(cardCatalog, null, 0), 'utf-8');
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 0), 'utf-8');
// Report covers the whole catalog, not just this run's --only subset.
const report = {};
const reported = new Set();
for (const c of Object.values(cardCatalog).flat()) {
    if (c.imageUrl || reported.has(c.id)) continue;
    reported.add(c.id);
    (report[c.setId] ??= []).push({ id: c.id, name: c.name, number: c.number });
}
writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
console.log(`\nUpdated tcg-cards.json and tcg-download-manifest.json; ${reported.size} cards still without an image, listed in ${REPORT_PATH}`);
console.log('Add a URL for any of those to scripts/tcg-image-overrides.json and re-run this script.');
