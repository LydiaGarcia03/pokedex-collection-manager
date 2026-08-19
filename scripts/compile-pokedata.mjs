/**
 * compile-pokedata.mjs
 *
 * Reads source data from the sibling `pokedex` project and compiles everything
 * into a single `public/data/pokemon-compiled.json` that the static site loads
 * once at startup.
 *
 * Run from the pokedex-static root:
 *   node scripts/compile-pokedata.mjs
 *
 * Source data expected at:
 *   ../pokedex/src/main/resources/data/
 *
 * Outputs:
 *   public/data/pokemon-compiled.json   ← all Pokémon, full detail
 *   public/data/type-chart.json         ← raw chart (kept for tooling reference)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DATA = join(__dirname, '../../pokedex/src/main/resources/data');
const OUT_DATA = join(__dirname, '../public/data');

mkdirSync(OUT_DATA, { recursive: true });

// ---------------------------------------------------------------------------
// Load source data files
// ---------------------------------------------------------------------------
function loadJson(file) {
    const path = join(SRC_DATA, file);
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    } catch (e) {
        console.error(`ERROR: Could not read ${path}`);
        console.error(`  Make sure the pokedex project is at ../pokedex/ and has generated its data files.`);
        console.error(`  Run: cd ../pokedex && ./gradlew bootRun   (once, to trigger generate-pokedata.mjs)`);
        process.exit(1);
    }
}

console.log('Loading source data files...');
const pokedex      = loadJson('pokedex.json');        // array of Pokémon entries
const extras       = loadJson('pokemon-extras.json'); // keyed by dexNumber (string)
const learnsets    = loadJson('learnsets.json');       // keyed by dexNumber (string)
const movesCatalog = loadJson('moves-catalog.json');   // keyed by move slug
const gamesCatalog = loadJson('games-catalog.json');   // keyed by game id
const dlcCatalog   = loadJson('dlc-catalog.json');      // keyed by dlc id
const typeChart    = loadJson('type-chart.json');       // ATTACK_TYPE -> { DEF_TYPE: multiplier }

console.log(`  Loaded ${pokedex.length} Pokémon entries`);
console.log(`  Loaded ${Object.keys(extras).length} extras entries`);
console.log(`  Loaded ${Object.keys(learnsets).length} learnset entries`);
console.log(`  Loaded ${Object.keys(movesCatalog).length} moves`);
console.log(`  Loaded ${Object.keys(gamesCatalog).length} games`);

// ---------------------------------------------------------------------------
// Type effectiveness computation
// Mirrors TypeChartService.java — defensive multipliers for a Pokémon's types
// ---------------------------------------------------------------------------
const ALL_TYPES = [
    'NORMAL','FIRE','WATER','GRASS','ELECTRIC','ICE',
    'FIGHTING','POISON','GROUND','FLYING','PSYCHIC','BUG',
    'ROCK','GHOST','DRAGON','DARK','STEEL','FAIRY',
];

function computeTypeEffectiveness(pokemonTypes) {
    const result = {};
    for (const attackType of ALL_TYPES) {
        const row = typeChart[attackType] ?? {};
        let multiplier = 1.0;
        for (const defType of pokemonTypes) {
            multiplier *= (row[defType] ?? 1.0);
        }
        if (multiplier !== 1.0) {
            // Round to avoid floating-point artifacts (e.g. 0.25000000000000003)
            result[attackType] = Math.round(multiplier * 10000) / 10000;
        }
    }
    return Object.keys(result).length > 0 ? result : null;
}

// ---------------------------------------------------------------------------
// Learnset compilation
// Mirrors PokemonResponseMapper.java
// ---------------------------------------------------------------------------
function buildLevelUpMoves(learnset) {
    if (!learnset?.levelUp?.length) return null;
    return learnset.levelUp.map(entry => {
        const move = movesCatalog[entry.moveSlug] ?? {};
        return {
            levelOrTm: String(entry.level),
            moveSlug:  entry.moveSlug,
            moveName:  move.name      ?? entry.moveSlug,
            type:      move.type      ?? null,
            category:  move.category  ?? null,
            power:     move.power     ?? null,
            accuracy:  move.accuracy  ?? null,
            shortEffect: move.shortEffect ?? null,
        };
    });
}

function buildMachineMoves(learnset) {
    const slugs = learnset?.machine;
    if (!slugs?.length) return null;
    return slugs.map((slug, i) => {
        const move = movesCatalog[slug] ?? {};
        return {
            levelOrTm: `TM${String(i + 1).padStart(2, '0')}`,
            moveSlug:  slug,
            moveName:  move.name      ?? slug,
            type:      move.type      ?? null,
            category:  move.category  ?? null,
            power:     move.power     ?? null,
            accuracy:  move.accuracy  ?? null,
            shortEffect: move.shortEffect ?? null,
        };
    });
}

// ---------------------------------------------------------------------------
// Recommended natures — derived from base stats (no nature is "assigned" to a
// species; we just suggest the 3 best fits based on its highest/lowest stats)
// ---------------------------------------------------------------------------
const NATURE_TABLE = [
    { name: 'Lonely',  increasedStat: 'attack',          decreasedStat: 'defense' },
    { name: 'Brave',   increasedStat: 'attack',          decreasedStat: 'speed' },
    { name: 'Adamant', increasedStat: 'attack',          decreasedStat: 'special-attack' },
    { name: 'Naughty', increasedStat: 'attack',          decreasedStat: 'special-defense' },
    { name: 'Bold',    increasedStat: 'defense',         decreasedStat: 'attack' },
    { name: 'Relaxed', increasedStat: 'defense',         decreasedStat: 'speed' },
    { name: 'Impish',  increasedStat: 'defense',         decreasedStat: 'special-attack' },
    { name: 'Lax',     increasedStat: 'defense',         decreasedStat: 'special-defense' },
    { name: 'Timid',   increasedStat: 'speed',           decreasedStat: 'attack' },
    { name: 'Hasty',   increasedStat: 'speed',           decreasedStat: 'defense' },
    { name: 'Jolly',   increasedStat: 'speed',           decreasedStat: 'special-attack' },
    { name: 'Naive',   increasedStat: 'speed',           decreasedStat: 'special-defense' },
    { name: 'Modest',  increasedStat: 'special-attack',  decreasedStat: 'attack' },
    { name: 'Mild',    increasedStat: 'special-attack',  decreasedStat: 'defense' },
    { name: 'Quiet',   increasedStat: 'special-attack',  decreasedStat: 'speed' },
    { name: 'Rash',    increasedStat: 'special-attack',  decreasedStat: 'special-defense' },
    { name: 'Calm',    increasedStat: 'special-defense', decreasedStat: 'attack' },
    { name: 'Gentle',  increasedStat: 'special-defense', decreasedStat: 'defense' },
    { name: 'Sassy',   increasedStat: 'special-defense', decreasedStat: 'speed' },
    { name: 'Careful', increasedStat: 'special-defense', decreasedStat: 'special-attack' },
];

function computeRecommendedNatures(ext) {
    const stats = {
        attack:            ext.attack,
        defense:           ext.defense,
        'special-attack':  ext.specialAttack,
        'special-defense': ext.specialDefense,
        speed:             ext.speed,
    };
    if (Object.values(stats).some(v => v == null)) return null;

    return NATURE_TABLE
        .map(n => ({ ...n, score: stats[n.increasedStat] - stats[n.decreasedStat] }))
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
        .slice(0, 3)
        .map(({ name, increasedStat, decreasedStat }) => ({ name, increasedStat, decreasedStat }));
}

// ---------------------------------------------------------------------------
// Games compilation — expands slug list → objects with iconUrl
// ---------------------------------------------------------------------------
function buildGames(gameSlugList, dlcBySlug, baseDexBySlug) {
    if (!gameSlugList?.length) return null;
    return gameSlugList
        .filter(slug => gamesCatalog[slug])
        .map(slug => {
            const info = gamesCatalog[slug];
            const dlcIds = dlcBySlug?.[slug];
            return {
                id:         slug,
                name:       info.name,
                iconUrl:    `/images/games/${slug}.webp`,
                generation: info.generation ?? null,
                dlc: dlcIds?.length
                    ? dlcIds.map(dlcId => ({ id: dlcId, name: dlcCatalog[dlcId]?.name ?? dlcId }))
                    : null,
                // Whether this Pokémon has an entry in the game's *base* regional dex (Paldea,
                // Galar) — independent of `dlc` above, since a Pokémon can be in both (e.g.
                // Slowpoke is in both the Galar dex and the Isle of Armor dex).
                inBaseDex: !!baseDexBySlug?.[slug],
            };
        });
}

// ---------------------------------------------------------------------------
// Compile each Pokémon entry
// ---------------------------------------------------------------------------
console.log('\nCompiling Pokémon data...');

const compiled = pokedex.map(pokemon => {
    // Both extras and learnsets are keyed by Pokémon ID ("0001", "0006-mega-x")
    // with fallback to the base form key (dexNumberFormatted = "0001", "0006")
    const ext = extras[pokemon.id] ?? extras[pokemon.dexNumberFormatted] ?? {};

    // Prefer the form-specific learnset; fall back to base form if the form entry
    // exists but has empty arrays (e.g. Gigantamax forms in the source data).
    const rawLearnset = learnsets[pokemon.id] ?? {};
    const learnset = (rawLearnset.levelUp?.length || rawLearnset.machine?.length)
        ? rawLearnset
        : (learnsets[pokemon.dexNumberFormatted] ?? {});

    return {
        // Core identity
        id:                   pokemon.id,
        dexNumber:            pokemon.dexNumber,
        dexNumberFormatted:   pokemon.dexNumberFormatted,
        name:                 pokemon.name,
        formName:             pokemon.formName ?? null,
        imageCode:            pokemon.imageCode,

        // Local image URLs (files downloaded by download-images.mjs)
        imageUrl:   `/images/pokemon/${pokemon.imageCode}.webp`,
        imageUrlXl: `/images/pokemon-xl/${pokemon.imageCode}.webp`,

        // Typing
        types: pokemon.types,

        // Evolution & flags (from pokedex.json)
        region:                pokemon.region    ?? null,
        legendary:             pokemon.legendary  ?? false,
        mythical:              pokemon.mythical   ?? false,
        fullyEvolved:          pokemon.fullyEvolved ?? false,
        capableOfMegaEvolution: pokemon.capableOfMegaEvolution ?? false,
        megaEvolutions:        pokemon.megaEvolutions ?? [],
        abilities:             pokemon.abilities  ?? [],
        moves:                 pokemon.moves      ?? [],
        previousEvolution:     pokemon.previousEvolution ?? null,
        nextEvolution:         pokemon.nextEvolution     ?? null,

        // Base stats (from pokemon-extras.json, keyed by dexNumber)
        hp:             ext.hp             ?? null,
        attack:         ext.attack         ?? null,
        defense:        ext.defense        ?? null,
        specialAttack:  ext.specialAttack  ?? null,
        specialDefense: ext.specialDefense ?? null,
        speed:          ext.speed          ?? null,

        // Physical / profile
        height:     ext.height     ?? null,
        weight:     ext.weight     ?? null,
        color:      ext.color      ?? null,
        maleRate:   ext.maleRate   ?? null,
        femaleRate: ext.femaleRate ?? null,
        generation: ext.generation ?? null,

        // Species characteristics
        genus:          ext.genus          ?? null,
        flavorText:     ext.flavorText     ?? null,
        captureRate:    ext.captureRate    ?? null,
        baseHappiness:  ext.baseHappiness  ?? null,
        growthRate:     ext.growthRate     ?? null,
        habitat:        ext.habitat        ?? null,
        eggGroups:      ext.eggGroups      ?? null,

        // Games — fall back to base form when an alternate form has no game data
        games: buildGames(ext.games, ext.dlc, ext.baseDex)
            ?? (pokemon.id !== pokemon.dexNumberFormatted
                ? buildGames(
                    (extras[pokemon.dexNumberFormatted] ?? {}).games,
                    (extras[pokemon.dexNumberFormatted] ?? {}).dlc,
                    (extras[pokemon.dexNumberFormatted] ?? {}).baseDex,
                )
                : null),

        // Pre-computed type effectiveness
        typeEffectiveness: computeTypeEffectiveness(pokemon.types),

        // Learnsets (from learnsets.json, keyed by dexNumber)
        levelUpMoves:  buildLevelUpMoves(learnset),
        machineMoves:  buildMachineMoves(learnset),

        // Top 3 recommended natures, derived from base stats
        recommendedNatures: computeRecommendedNatures(ext),
    };
});

// ---------------------------------------------------------------------------
// Write outputs
// ---------------------------------------------------------------------------
const compiledPath = join(OUT_DATA, 'pokemon-compiled.json');
writeFileSync(compiledPath, JSON.stringify(compiled, null, 0), 'utf-8');
const sizeKb = Math.round(readFileSync(compiledPath).length / 1024);
console.log(`\nWrote pokemon-compiled.json  (${sizeKb} KB, ${compiled.length} Pokémon)`);

// Copy type-chart for reference
const typeChartPath = join(OUT_DATA, 'type-chart.json');
writeFileSync(typeChartPath, JSON.stringify(typeChart, null, 2), 'utf-8');
console.log('Wrote type-chart.json');

console.log('\nDone. Next step: npm run collect-tcg');
