import type { Pokemon, PokemonType, TcgCard, TcgCardsApiResponse } from '../types/Pokemon';

// import.meta.env.BASE_URL is set by Vite to the value of `base` in vite.config.ts.
// In production this is '/pokedex-collection-manager-static/'.
// In development (npm run dev) it is '/'.
const BASE = import.meta.env.BASE_URL;

let pokemonCache: Pokemon[] | null = null;
let tcgCardCache: Record<string, TcgCard[]> | null = null;

// Image URLs in the JSON are stored as absolute paths (e.g. "/images/pokemon/...").
// Vite serves public/ files under BASE, so we must prepend BASE to avoid 404s
// both in local dev and on GitHub Pages.
function resolveUrl(url: string | null | undefined): string | null {
    if (!url) return url ?? null;
    return url.startsWith('/') ? BASE + url.slice(1) : url;
}

// Shiny sprites aren't part of the local image set — fetched on demand from PokéPC's CDN.
export function getShinyImageUrl(imageCode: string): string {
    return `https://static.pokepc.net/images/pokemon/home3d-icon-xl/shiny/${imageCode}.webp`;
}

export async function loadAllPokemon(): Promise<Pokemon[]> {
    if (pokemonCache) return pokemonCache;
    const res = await fetch(`${BASE}data/pokemon-compiled.json`);
    if (!res.ok) throw new Error('Failed to load Pokémon data');
    const raw = (await res.json()) as Pokemon[];
    pokemonCache = raw.map(p => ({
        ...p,
        imageUrl: resolveUrl(p.imageUrl) ?? p.imageUrl,
        imageUrlXl: resolveUrl(p.imageUrlXl) ?? p.imageUrlXl,
        games: p.games?.map(g => ({ ...g, iconUrl: resolveUrl(g.iconUrl?.replace(/\.png$/, '.webp')) })) ?? null,
    }));
    return pokemonCache;
}

async function loadTcgCardCatalog(): Promise<Record<string, TcgCard[]>> {
    if (tcgCardCache !== null) return tcgCardCache;
    try {
        const res = await fetch(`${BASE}data/tcg-cards.json`);
        if (!res.ok) { tcgCardCache = {}; return tcgCardCache; }
        const raw = (await res.json()) as Record<string, TcgCard[]>;
        tcgCardCache = {};
        for (const [name, cards] of Object.entries(raw)) {
            tcgCardCache[name] = cards.map(c => ({ ...c, imageUrl: resolveUrl(c.imageUrl) }));
        }
    } catch {
        tcgCardCache = {};
    }
    return tcgCardCache;
}

// Accepts pokemon name (not ID) — keyed by name.toLowerCase() in tcg-cards.json
export async function fetchTcgCards(pokemonName: string): Promise<TcgCardsApiResponse> {
    try {
        const catalog = await loadTcgCardCatalog();
        const cards = catalog[pokemonName.toLowerCase()] ?? [];
        return { cards, dataUnavailable: false };
    } catch {
        return { cards: [], dataUnavailable: true };
    }
}

export interface PokemonFilters {
    types?: PokemonType[]; // OR — empty/undefined = no filter
    generations?: number[]; // OR — empty/undefined = no filter
    gameIds?: string[]; // OR — empty/undefined = no filter
    dlcId?: string | null; // only meaningful alongside a single gameId — require this DLC tag
    dlcBaseOnly?: boolean; // only meaningful alongside a single gameId — require an entry in the game's base regional dex
    excludeForms?: boolean; // keep only base species (see isBaseForm)
}

// The base form's id is always the dex number itself with no suffix (e.g. "0925"),
// regardless of whether its formName is set — some species (Maushold, Deoxys, Rotom...)
// give every one of their forms a non-null formName, so formName can't be used to
// tell the base form apart from its alternates. Dex number + id suffix is authoritative.
function isBaseForm(p: Pokemon): boolean {
    return p.id === p.dexNumberFormatted;
}

export function filterPokemon(
    all: Pokemon[],
    search?: string,
    filters?: PokemonFilters,
): Pokemon[] {
    const q = search ? normalize(search) : '';
    const { types, generations, gameIds, dlcId, dlcBaseOnly, excludeForms } = filters ?? {};
    const matchesOtherFilters = (p: Pokemon): boolean => {
        if (q && !matchesSearch(p, q)) return false;
        if (types?.length && !types.some(t => p.types.includes(t))) return false;
        if (generations?.length && (p.generation == null || !generations.includes(p.generation))) return false;
        if (gameIds?.length && !p.games?.some(g => gameIds.includes(g.id))) return false;
        if (dlcId && !p.games?.some(g => gameIds?.includes(g.id) && g.dlc?.some(d => d.id === dlcId))) return false;
        if (dlcBaseOnly && !p.games?.some(g => gameIds?.includes(g.id) && g.inBaseDex)) return false;
        return true;
    };

    if (!excludeForms) {
        return all.filter(matchesOtherFilters);
    }

    // "Exclude forms" collapses each species down to a single entry — normally the
    // base form. But some species have data gaps on their base entry specifically
    // (e.g. Maushold's base "Family of Four" has no `games` recorded in the source
    // dataset even though the species is in Scarlet/Violet — the data only ended up
    // attached to the "Family of Three" entry). If the base form fails an active
    // filter while a sibling form passes it, show that sibling instead of hiding the
    // species outright — at least one entry per matching species should stay visible.
    const matchesByDex = new Map<string, Pokemon[]>();
    for (const p of all) {
        if (!matchesOtherFilters(p)) continue;
        const key = p.dexNumberFormatted;
        const bucket = matchesByDex.get(key);
        if (bucket) bucket.push(p);
        else matchesByDex.set(key, [p]);
    }

    const representativeIds = new Set<string>();
    for (const matches of matchesByDex.values()) {
        const representative = matches.find(isBaseForm) ?? matches[0];
        representativeIds.add(representative.id);
    }

    return all.filter(p => representativeIds.has(p.id));
}

function normalize(s: string): string {
    return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function matchesSearch(pokemon: Pokemon, q: string): boolean {
    return (
        normalize(pokemon.name).includes(q) ||
        normalize(pokemon.dexNumberFormatted).includes(q) ||
        normalize(String(pokemon.dexNumber)).includes(q) ||
        normalize(pokemon.formName ?? '').includes(q)
    );
}
