/**
 * fetch-serebii-dlc-reference.mjs
 *
 * One-time (re-runnable) fetch of Serebii's per-region Pokédex pages, used to build a
 * "which Pokémon appear in which DLC — and which are in the base region dex" reference file.
 *
 * Why this exists: neither PokeAPI, nor pokepc.net's dataset (see fetch-pokepc-games-reference.mjs)
 * track DLC as a separate game id — a Pokémon obtainable only via Scarlet/Violet's Teal Mask DLC
 * is folded into plain "Scarlet"/"Violet" in both sources. Serebii maintains a dedicated regional
 * Pokédex page per DLC (Kitakami, Blueberry, Isle of Armor, Crown Tundra) that we scrape instead.
 *
 * We also fetch the *base* regional dex (Paldea, Galar) — a Pokémon can legitimately have an
 * entry in both the base dex and a DLC dex (e.g. Slowpoke is in both Galar and Isle of Armor), so
 * "does this Pokémon have a DLC tag" alone can't answer "is this Pokémon in the base game dex".
 * Verified against public totals (Bulbapedia et al.): Paldea = 400, Galar = 400.
 *
 * Unlike pokepc.net, these are plain server-rendered HTML pages — no Puppeteer needed.
 *
 * Run with: node scripts/fetch-serebii-dlc-reference.mjs
 * Output:   scripts/serebii-dlc-reference.json (gitignored — intermediate file)
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, 'serebii-dlc-reference.json');

const DLCS = [
    {
        id: 'teal-mask',
        name: 'The Teal Mask',
        games: ['sv-s', 'sv-v'],
        url: 'https://www.serebii.net/scarletviolet/kitakamipokedex.shtml',
    },
    {
        id: 'indigo-disk',
        name: 'The Indigo Disk',
        games: ['sv-s', 'sv-v'],
        url: 'https://www.serebii.net/scarletviolet/blueberrypokedex.shtml',
    },
    {
        id: 'isle-of-armor',
        name: 'Isle of Armor',
        games: ['swsh-sw', 'swsh-sh'],
        url: 'https://www.serebii.net/swordshield/isleofarmordex.shtml',
    },
    {
        id: 'crown-tundra',
        name: 'Crown Tundra',
        games: ['swsh-sw', 'swsh-sh'],
        url: 'https://www.serebii.net/swordshield/thecrowntundradex.shtml',
    },
];

// Base (non-DLC) regional Pokédex per game pair — used to determine true base-game membership,
// independent of whether a Pokémon also happens to have a DLC dex entry.
const BASE_REGIONS = [
    {
        id: 'paldea',
        games: ['sv-s', 'sv-v'],
        url: 'https://www.serebii.net/scarletviolet/paldeapokedex.shtml',
    },
    {
        id: 'galar',
        games: ['swsh-sw', 'swsh-sh'],
        url: 'https://www.serebii.net/swordshield/galarpokedex.shtml',
    },
];

// Matches rows like: <a href="/pokedex-sv/spinarak/">Spinarak<br /></a>
// or (SwSh pages, which also carry a Japanese name after the <br />):
//   <a href="/pokedex-swsh/slowpoke/">Slowpoke<br />ヤドン</a>
const ENTRY_RE = /href="\/pokedex-(?:sv|swsh)\/([a-z0-9-]+)\/">([^<]+)<br/g;

async function fetchPokemonSlugs(url) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const html = await res.text();

    const slugs = new Set();
    for (const match of html.matchAll(ENTRY_RE)) {
        slugs.add(match[1]);
    }
    return [...slugs];
}

async function main() {
    const reference = { dlc: {}, baseRegions: {} };

    for (const dlc of DLCS) {
        console.log(`Fetching DLC dex: ${dlc.name} (${dlc.url}) ...`);
        const pokemon = await fetchPokemonSlugs(dlc.url);
        console.log(`  Found ${pokemon.length} entries`);
        reference.dlc[dlc.id] = { name: dlc.name, games: dlc.games, pokemon };
    }

    for (const region of BASE_REGIONS) {
        console.log(`Fetching base region dex: ${region.id} (${region.url}) ...`);
        const pokemon = await fetchPokemonSlugs(region.url);
        console.log(`  Found ${pokemon.length} entries`);
        reference.baseRegions[region.id] = { games: region.games, pokemon };
    }

    writeFileSync(OUT_PATH, JSON.stringify(reference, null, 2), 'utf-8');
    console.log(`\nWrote ${OUT_PATH}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
