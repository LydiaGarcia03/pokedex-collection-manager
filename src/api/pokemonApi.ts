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

export function filterPokemon(
    all: Pokemon[],
    search?: string,
    type?: PokemonType | null,
    generation?: number | null,
): Pokemon[] {
    const q = search ? normalize(search) : '';
    return all.filter(p => {
        if (q && !matchesSearch(p, q)) return false;
        if (type && !p.types.includes(type)) return false;
        if (generation != null && p.generation !== generation) return false;
        return true;
    });
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
