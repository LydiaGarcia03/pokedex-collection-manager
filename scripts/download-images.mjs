/**
 * download-images.mjs
 *
 * Downloads three categories of images into public/images/:
 *
 *   1. Pokémon sprites (regular)   → public/images/pokemon/{imageCode}.webp
 *   2. Pokémon sprites (XL)        → public/images/pokemon-xl/{imageCode}.webp
 *   3. Game icons                  → public/images/games/{gameId}.png
 *   4. TCG card images (low)       → public/images/tcg/{cardId}/low.webp
 *
 * Sources:
 *   - Pokémon sprites: static.pokepc.net CDN
 *   - Game icons:      static.pokepc.net CDN
 *   - TCG cards:       TCGdex CDN (URLs from tcg-download-manifest.json)
 *
 * Run from the pokedex-static root:
 *   node scripts/download-images.mjs
 *
 * Prerequisites:
 *   npm run compile-data   (produces pokemon-compiled.json)
 *   npm run collect-tcg    (produces tcg-download-manifest.json)
 *
 * Idempotent: already-downloaded files are skipped.
 * Failed downloads are logged to public/data/download-errors.json.
 *
 * Estimated duration: ~20 minutes total (~1500 sprites + ~18300 TCG cards).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = join(__dirname, '../public/data');
const IMG_DIR    = join(__dirname, '../public/images');

const COMPILED_PATH  = join(DATA_DIR, 'pokemon-compiled.json');
const MANIFEST_PATH  = join(DATA_DIR, 'tcg-download-manifest.json');
const ERRORS_PATH    = join(DATA_DIR, 'download-errors.json');

const POKEMON_CDN    = 'https://static.pokepc.net/images/pokemon/home3d-icon/regular';
const POKEMON_XL_CDN = 'https://static.pokepc.net/images/pokemon/home3d-icon-xl/regular';
const GAMES_CDN      = 'https://static.pokepc.net/images/games/icons';

// Concurrent downloads per batch (stay polite to CDNs)
const SPRITE_CONCURRENCY = 5;
const CARD_CONCURRENCY   = 8;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
if (!existsSync(COMPILED_PATH)) {
    console.error('ERROR: public/data/pokemon-compiled.json not found. Run `npm run compile-data` first.');
    process.exit(1);
}
if (!existsSync(MANIFEST_PATH)) {
    console.error('ERROR: public/data/tcg-download-manifest.json not found. Run `npm run collect-tcg` first.');
    process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function ensureDir(dir) { mkdirSync(dir, { recursive: true }); }

async function downloadFile(url, destPath) {
    if (existsSync(destPath)) return 'skip';

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (!res.ok) return `http-${res.status}`;

        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(destPath, buf);
        return 'ok';
    } catch (e) {
        return `error:${e.message?.slice(0, 60)}`;
    }
}

async function runBatch(items, concurrency, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += concurrency) {
        const chunk = items.slice(i, i + concurrency);
        const chunkResults = await Promise.all(chunk.map(fn));
        results.push(...chunkResults);
    }
    return results;
}

// ---------------------------------------------------------------------------
// Load data
// ---------------------------------------------------------------------------
const allPokemon = JSON.parse(readFileSync(COMPILED_PATH, 'utf-8'));
const manifest   = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

// Deduplicate imageCodes (multiple Pokémon forms may share the same imageCode)
const uniqueImageCodes = [...new Set(allPokemon.map(p => p.imageCode))];

// Deduplicate game icons
const uniqueGames = new Map();
for (const p of allPokemon) {
    if (p.games) {
        for (const g of p.games) {
            if (!uniqueGames.has(g.id)) uniqueGames.set(g.id, g);
        }
    }
}

const errors = {};

// ---------------------------------------------------------------------------
// 1. Pokémon sprites (regular)
// ---------------------------------------------------------------------------
console.log(`\n[1/4] Pokémon sprites (regular) — ${uniqueImageCodes.length} files`);
ensureDir(join(IMG_DIR, 'pokemon'));

let spriteOk = 0, spriteSkip = 0, spriteFail = 0;
const spriteResults = await runBatch(uniqueImageCodes, SPRITE_CONCURRENCY, async code => {
    const url  = `${POKEMON_CDN}/${code}.webp`;
    const dest = join(IMG_DIR, 'pokemon', `${code}.webp`);
    const r    = await downloadFile(url, dest);
    if (r === 'ok')   spriteOk++;
    else if (r === 'skip') spriteSkip++;
    else { spriteFail++; errors[`pokemon/${code}.webp`] = r; }
    process.stdout.write(`\r  ${spriteOk + spriteSkip + spriteFail}/${uniqueImageCodes.length} (${spriteFail} errors)   `);
    return r;
});
void spriteResults;
console.log(`\n  Done — ${spriteOk} downloaded, ${spriteSkip} skipped, ${spriteFail} errors`);

// ---------------------------------------------------------------------------
// 2. Pokémon sprites (XL)
// ---------------------------------------------------------------------------
console.log(`\n[2/4] Pokémon sprites (XL) — ${uniqueImageCodes.length} files`);
ensureDir(join(IMG_DIR, 'pokemon-xl'));

let xlOk = 0, xlSkip = 0, xlFail = 0;
const xlResults = await runBatch(uniqueImageCodes, SPRITE_CONCURRENCY, async code => {
    const url  = `${POKEMON_XL_CDN}/${code}.webp`;
    const dest = join(IMG_DIR, 'pokemon-xl', `${code}.webp`);
    const r    = await downloadFile(url, dest);
    if (r === 'ok')   xlOk++;
    else if (r === 'skip') xlSkip++;
    else { xlFail++; errors[`pokemon-xl/${code}.webp`] = r; }
    process.stdout.write(`\r  ${xlOk + xlSkip + xlFail}/${uniqueImageCodes.length} (${xlFail} errors)   `);
    return r;
});
void xlResults;
console.log(`\n  Done — ${xlOk} downloaded, ${xlSkip} skipped, ${xlFail} errors`);

// ---------------------------------------------------------------------------
// 3. Game icons
// ---------------------------------------------------------------------------
const gameEntries = [...uniqueGames.values()];
console.log(`\n[3/4] Game icons — ${gameEntries.length} files`);
ensureDir(join(IMG_DIR, 'games'));

let gameOk = 0, gameSkip = 0, gameFail = 0;
for (const game of gameEntries) {
    const dest = join(IMG_DIR, 'games', `${game.id}.webp`);
    const r = await downloadFile(`${GAMES_CDN}/${game.id}.webp`, dest);
    if (r === 'ok')   gameOk++;
    else if (r === 'skip') gameSkip++;
    else { gameFail++; errors[`games/${game.id}`] = r; }
}
console.log(`  Done — ${gameOk} downloaded, ${gameSkip} skipped, ${gameFail} errors`);

// ---------------------------------------------------------------------------
// 4. TCG card images (low quality)
// ---------------------------------------------------------------------------
const cardEntries = Object.entries(manifest); // [cardId, srcUrl]
console.log(`\n[4/4] TCG card images (low) — ${cardEntries.length} files`);

let cardOk = 0, cardSkip = 0, cardFail = 0;
const cardResults = await runBatch(cardEntries, CARD_CONCURRENCY, async ([cardId, srcUrl]) => {
    const dir  = join(IMG_DIR, 'tcg', cardId);
    const dest = join(dir, 'low.webp');
    ensureDir(dir);
    const r = await downloadFile(srcUrl, dest);
    if (r === 'ok')   cardOk++;
    else if (r === 'skip') cardSkip++;
    else { cardFail++; errors[`tcg/${cardId}`] = r; }
    const total = cardOk + cardSkip + cardFail;
    if (total % 100 === 0 || total === cardEntries.length) {
        process.stdout.write(`\r  ${total}/${cardEntries.length} (${cardFail} errors)   `);
    }
    return r;
});
void cardResults;
console.log(`\n  Done — ${cardOk} downloaded, ${cardSkip} skipped, ${cardFail} errors`);

// ---------------------------------------------------------------------------
// Write error log
// ---------------------------------------------------------------------------
if (Object.keys(errors).length > 0) {
    writeFileSync(ERRORS_PATH, JSON.stringify(errors, null, 2), 'utf-8');
    console.log(`\nWarning: ${Object.keys(errors).length} download errors logged to public/data/download-errors.json`);
} else {
    console.log('\nNo errors.');
}

// ---------------------------------------------------------------------------
// Size estimate
// ---------------------------------------------------------------------------
console.log('\n--- Summary ---');
console.log(`Sprites (regular): ${spriteOk + spriteSkip} files`);
console.log(`Sprites (XL):      ${xlOk + xlSkip} files`);
console.log(`Game icons:        ${gameOk + gameSkip} files`);
console.log(`TCG cards:         ${cardOk + cardSkip} files`);
console.log('\nDone! Commit public/images/ and public/data/ to the repository, then push to deploy.');
