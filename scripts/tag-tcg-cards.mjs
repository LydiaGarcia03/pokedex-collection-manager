/**
 * tag-tcg-cards.mjs
 *
 * Marks the cards in public/data/tcg-cards.json that the TCG tab's type filters look for:
 *   - fullArt: true — the art covers the whole card (no solid-color text box)
 *   - promo: true   — the card carries the PROMO mark, which comes from its set
 * Both fields are only written when true. They belong to this script: every run recomputes them,
 * so a card that stops matching loses the field. No card is ever added or removed here.
 *
 * Promo: English sets whose name in tcg-sets.json contains "Promo" (Black Star Promos, Promos-A,
 * Miscellaneous Promos) and Japanese promo sets (id ending in "-P", e.g. ja-SV-P).
 *
 * Full art: TCGdex has no "full art" field, so it's read from the card's rarity:
 *   - rarities that are always full art (FULL_ART_RARITIES);
 *   - "Ultra Rare" is full art from Sword & Shield on, but in BW / XY / SM TCGdex also calls the
 *     regular EX/GX "Ultra Rare" (xy1-97 Xerneas EX regular, xy1-146 full art). Those sets print
 *     their full arts after every regular card, so there an Ultra Rare is full art when its
 *     number comes after the set's last regular card (RC subsets are counted on their own);
 *   - every card of Trainer Gallery (*tg) and Galarian Gallery (*gg);
 *   - scripts/tcg-full-art-overrides.json ({ "cardId": true | false }) wins over all of the above.
 *     Promo full arts have rarity "Promo" in TCGdex, so they can only come from there.
 *
 * Japan-exclusive cards (lang: "ja") are looked up one by one in TCGdex's Japanese API, which uses
 * the same rarity names. Those answers are cached in scripts/.cache/ (gitignored).
 *
 * Run from the pokedex-static root, after collect-tcg (and collect-tcg-japanese):
 *   node scripts/tag-tcg-cards.mjs            # tag and write tcg-cards.json
 *   node scripts/tag-tcg-cards.mjs --dry-run  # only report; writes the Ultra Rare review list
 *                                             # to scripts/.cache/tag-tcg-review.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR  = join(__dirname, '../public/data');
const CACHE_DIR = join(__dirname, '.cache');

const CARDS_PATH     = join(DATA_DIR, 'tcg-cards.json');
const SETS_PATH      = join(DATA_DIR, 'tcg-sets.json');
const OVERRIDES_PATH = join(__dirname, 'tcg-full-art-overrides.json');
const JA_RARITY_CACHE_PATH = join(CACHE_DIR, 'tcgdex-ja-rarities.json');
const REVIEW_PATH    = join(CACHE_DIR, 'tag-tcg-review.json');

const TCGDEX_EN = 'https://api.tcgdex.net/v2/en';
const TCGDEX_JA = 'https://api.tcgdex.net/v2/ja';
const CONCURRENCY = 6;

const FULL_ART_RARITIES = [
    'Illustration rare', 'Special illustration rare', 'Hyper rare', 'Mega Hyper Rare', 'Secret Rare',
    'Shiny Ultra Rare', 'Shiny rare V', 'Shiny rare VMAX', 'Black White Rare', 'Full Art Trainer',
    // TCG Pocket. "One Shiny" isn't here: those keep a text box (e.g. A3a-089).
    'One Star', 'Two Star', 'Three Star', 'Crown', 'Two Shiny',
];
const ULTRA_RARE = 'Ultra Rare';
// Eras where TCGdex's "Ultra Rare" also covers the regular EX/GX (setId without the "ja-" prefix).
const AMBIGUOUS_ULTRA_RARE_SETS = /^(bw|xy|sm|g1|dc1|det1)/i;
const ALL_FULL_ART_SETS = /(tg|gg)$/;

const DRY_RUN = process.argv.includes('--dry-run');

for (const path of [CARDS_PATH, SETS_PATH]) {
    if (!existsSync(path)) {
        console.error(`ERROR: ${path} not found. Run npm run collect-tcg first.`);
        process.exit(1);
    }
}
mkdirSync(CACHE_DIR, { recursive: true });

const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : fallback);

async function fetchJson(url) {
    let lastError;
    // TCGdex answers 503 now and then under load; it clears up after a few seconds.
    for (let attempt = 0; attempt < 6; attempt++) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (error) {
            lastError = error;
            await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
        }
    }
    throw new Error(`${url}: ${lastError.message}`);
}

async function inPool(items, worker) {
    let next = 0;
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
        while (next < items.length) await worker(items[next++]);
    }));
}

const catalog  = readJson(CARDS_PATH, {});
const setNames = readJson(SETS_PATH, {});
const overrides = readJson(OVERRIDES_PATH, {});
const allCards = Object.values(catalog).flat();

// ---------------------------------------------------------------------------
// Rarity of every card: English lists per rarity, Japanese cards one by one
// ---------------------------------------------------------------------------
const rarityById = new Map();
for (const rarity of [...FULL_ART_RARITIES, ULTRA_RARE]) {
    // A failed list would silently untag a whole rarity, so it aborts the run instead.
    // "eq:" = exact match; without it "Ultra Rare" also returns "Shiny Ultra Rare".
    const cards = await fetchJson(`${TCGDEX_EN}/cards?rarity=${encodeURIComponent(`eq:${rarity}`)}`);
    for (const card of cards ?? []) rarityById.set(card.id, rarity);
}

const jaRarities = readJson(JA_RARITY_CACHE_PATH, {});
const jaToFetch = allCards.filter(c => c.lang === 'ja' && !(c.id in jaRarities));
await inPool(jaToFetch, async card => {
    const tcgdexId = card.id.replace(/^ja-/, '');
    const detail = await fetchJson(`${TCGDEX_JA}/cards/${encodeURIComponent(tcgdexId)}`);
    jaRarities[card.id] = detail?.rarity ?? null;
});
writeFileSync(JA_RARITY_CACHE_PATH, JSON.stringify(jaRarities), 'utf-8');
for (const [id, rarity] of Object.entries(jaRarities)) if (rarity) rarityById.set(id, rarity);

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------
const numberValue = card => {
    const digits = String(card.number ?? '').match(/\d+/);
    return digits ? Number(digits[0]) : Number.MAX_SAFE_INTEGER;
};
const bareSetId = setId => (setId ?? '').replace(/^ja-/, '');

const cardsBySet = new Map();
for (const card of allCards) {
    if (!card.setId) continue;
    if (!cardsBySet.has(card.setId)) cardsBySet.set(card.setId, new Map());
    cardsBySet.get(card.setId).set(card.id, card); // a card can sit under several Pokémon keys
}

// Cards numbered with a letter prefix (g1 "RC25", bw11 "RC21") are a subset with its own order.
const numberPrefix = card => String(card.number ?? '').match(/^[A-Za-z]*/)[0].toUpperCase();

// In BW / XY / SM the full arts come after every regular card of the set (or of the RC subset),
// Trainers and Energy included, while the regular EX/GX sit among the other Pokémon. The catalog
// only has Pokémon, so the set's full card list comes from TCGdex. The last regular card is the
// last one that isn't Ultra Rare or one of the full art rarities.
const ambiguousSetIds = [...new Set(allCards
    .filter(c => rarityById.get(c.id) === ULTRA_RARE && AMBIGUOUS_ULTRA_RARE_SETS.test(bareSetId(c.setId)))
    .map(c => c.setId))];
const setCardLists = new Map();
const lastRegularNumber = new Map();
await inPool(ambiguousSetIds, async setId => {
    if (setId.startsWith('ja-')) {
        // Only our few Japan-exclusive cards have a known rarity, so the rest of a Japanese set
        // can't be sorted out. Japanese sets number their full arts past the official count.
        const set = await fetchJson(`${TCGDEX_JA}/sets/${encodeURIComponent(bareSetId(setId))}`);
        lastRegularNumber.set(`${setId}|`, set?.cardCount?.official ?? Number.MAX_SAFE_INTEGER);
        return;
    }
    const set = await fetchJson(`${TCGDEX_EN}/sets/${encodeURIComponent(setId)}`);
    const cards = (set?.cards ?? []).map(c => ({ id: c.id, number: c.localId }));
    // Without TCGdex's list, fall back to the catalog's Pokémon cards.
    setCardLists.set(setId, cards.length ? cards : [...cardsBySet.get(setId).values()]);
});

function lastRegularIn(setId, prefix) {
    const key = `${setId}|${prefix}`;
    if (!lastRegularNumber.has(key)) {
        let last = 0;
        for (const c of setCardLists.get(setId)) {
            const rarity = rarityById.get(c.id);
            if (numberPrefix(c) !== prefix || rarity === ULTRA_RARE || FULL_ART_RARITIES.includes(rarity)) continue;
            last = Math.max(last, numberValue(c));
        }
        lastRegularNumber.set(key, last);
    }
    return lastRegularNumber.get(key);
}

const review = [];
function isAmbiguousUltraRareFullArt(card) {
    const last = lastRegularIn(card.setId, numberPrefix(card));
    const fullArt = numberValue(card) > last;
    review.push({ id: card.id, name: card.name, number: card.number, fullArt, lastRegular: last });
    return fullArt;
}

const isPromoSet = setId =>
    Boolean(setId) && (setId.startsWith('ja-') ? /-P$/.test(setId) : /promo/i.test(setNames[setId] ?? ''));

function fullArtReason(card) {
    if (card.id in overrides) return overrides[card.id] ? 'override' : null;
    const rarity = rarityById.get(card.id);
    if (FULL_ART_RARITIES.includes(rarity)) return rarity;
    if (rarity === ULTRA_RARE) {
        if (!AMBIGUOUS_ULTRA_RARE_SETS.test(bareSetId(card.setId))) return 'Ultra Rare';
        return isAmbiguousUltraRareFullArt(card) ? 'Ultra Rare (BW/XY/SM, by number)' : null;
    }
    if (ALL_FULL_ART_SETS.test(card.setId ?? '')) return 'Trainer / Galarian Gallery';
    return null;
}

// ---------------------------------------------------------------------------
// Tag
// ---------------------------------------------------------------------------
const fullArtCounts = {};
const tagged = new Map(); // id → { fullArt, promo }, so cards under several Pokémon get one answer
for (const card of allCards) {
    if (tagged.has(card.id)) continue;
    const reason = fullArtReason(card);
    if (reason) fullArtCounts[reason] = (fullArtCounts[reason] ?? 0) + 1;
    tagged.set(card.id, { fullArt: Boolean(reason), promo: isPromoSet(card.setId) });
}

let changed = 0;
for (const cards of Object.values(catalog)) {
    for (const card of cards) {
        const { fullArt, promo } = tagged.get(card.id);
        if (Boolean(card.fullArt) !== fullArt || Boolean(card.promo) !== promo) changed++;
        if (fullArt) card.fullArt = true; else delete card.fullArt;
        if (promo) card.promo = true; else delete card.promo;
    }
}

const unique = [...tagged.values()];
console.log(`Cards: ${tagged.size} unique`);
console.log(`Full art: ${unique.filter(t => t.fullArt).length}`);
for (const [reason, count] of Object.entries(fullArtCounts).sort((a, b) => b[1] - a[1])) console.log(`  ${reason}: ${count}`);
console.log(`Promo: ${unique.filter(t => t.promo).length}`);
console.log(`Ultra Rare decided by number (BW/XY/SM): ${review.length} ` +
    `(${review.filter(r => r.fullArt).length} full art) — list in ${REVIEW_PATH}`);
writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 1), 'utf-8');

if (DRY_RUN) {
    console.log(`\nDry run: ${changed} card entries would change. Nothing written.`);
} else {
    writeFileSync(CARDS_PATH, JSON.stringify(catalog, null, 0), 'utf-8');
    console.log(`\n${changed} card entries changed. Wrote ${CARDS_PATH}`);
}
