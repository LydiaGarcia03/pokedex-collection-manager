/**
 * fetch-pokepc-games-reference.mjs
 *
 * One-time (re-runnable) fetch of pokepc.net's public dataset, used to build an accurate
 * per-version "which games is this Pokémon obtainable in" reference file.
 *
 * Why this exists: neither PokeAPI's `game_indices` nor `moves.version_group_details` encode
 * true per-version exclusivity (see .ai/changes-log.md entry for the investigation) — for every
 * paired game (Red/Blue, Scarlet/Violet, etc.) both fields report identical data for both
 * versions. pokepc.net's dataset does track this correctly (cross-checked against known
 * exclusives: Larvitar/Vulpix-Alola = Scarlet-only, Bagon/Sandshrew-Alola = Violet-only, and
 * their evolutions inherit it correctly). We use it here as a one-time, build-time reference —
 * the output is a small static JSON committed nowhere at runtime, only consumed by
 * ../pokedex/scripts/patch-games.mjs and generate-pokedata.mjs.
 *
 * pokepc.net's dataset is a client-hydrated JSON fetched dynamically (its CDN URL includes a
 * rotating content hash), so a plain HTTP fetch of the page HTML doesn't reveal it — this
 * script uses Puppeteer to load a real page and intercept the network response.
 *
 * Run with: node scripts/fetch-pokepc-games-reference.mjs
 * Output:   scripts/pokepc-games-reference.json (gitignored — intermediate file)
 */

import puppeteer from 'puppeteer';
import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, 'pokepc-games-reference.json');

// Only keep games our own project actually tracks (games-catalog.json in the sibling `pokedex`
// project) — pokepc.net tracks a few titles we don't (e.g. very recent releases).
const OUR_GAMES_CATALOG = join(__dirname, '../../pokedex/src/main/resources/data/games-catalog.json');

async function main() {
  const ourGameIds = new Set(Object.keys(JSON.parse(readFileSync(OUR_GAMES_CATALOG, 'utf-8'))));
  console.log(`Tracking ${ourGameIds.size} game ids from our own games-catalog.json`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  let datasetJson = null;
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('cdn.pokepc.net/dataset/') && url.endsWith('.json')) {
      try {
        datasetJson = await response.json();
        console.log(`  Captured dataset: ${url}`);
      } catch (e) {
        console.warn('  Failed to parse dataset response:', e.message);
      }
    }
  });

  console.log('Loading pokepc.net/pokedex/national ...');
  await page.goto('https://pokepc.net/pokedex/national', { waitUntil: 'networkidle0', timeout: 60000 });

  for (let i = 0; i < 20 && !datasetJson; i++) {
    await new Promise((r) => setTimeout(r, 500));
  }
  await browser.close();

  if (!datasetJson) {
    console.error('ERROR: never observed a cdn.pokepc.net/dataset/*.json network response.');
    process.exit(1);
  }

  console.log(`Dataset loaded: ${datasetJson.pokemon.length} pokemon`);

  const reference = {};
  for (const p of datasetJson.pokemon) {
    const games = (p.obtainableIn || []).filter((g) => ourGameIds.has(g));
    if (games.length) reference[p.nid] = games;
  }

  writeFileSync(OUT_PATH, JSON.stringify(reference, null, 2), 'utf-8');
  console.log(`\nWrote ${Object.keys(reference).length} entries to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
