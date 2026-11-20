import type { Pokemon, PokemonMoves, PokemonSummary, PokemonTypeFilterId, TcgCard, TcgCardForm, TcgCardsApiResponse } from '../types/Pokemon';

// import.meta.env.BASE_URL is set by Vite to the value of `base` in vite.config.ts.
// In production this is '/pokedex-collection-manager-static/'.
// In development (npm run dev) it is '/'.
const BASE = import.meta.env.BASE_URL;

let pokemonCache: Pokemon[] | null = null;
let tcgCardCache: Record<string, TcgCard[]> | null = null;
const movesCache = new Map<string, Promise<PokemonMoves>>();

/** One Pokémon's moves, kept out of pokemon-compiled.json so the listing loads fast. */
export function loadPokemonMoves(pokemonId: string): Promise<PokemonMoves> {
    let request = movesCache.get(pokemonId);
    if (!request) {
        request = fetch(`${BASE}data/moves/${pokemonId}.json`).then(res => {
            if (!res.ok) throw new Error(`Failed to load moves for ${pokemonId}`);
            return res.json() as Promise<PokemonMoves>;
        });
        // A failed request isn't cached, so reopening the Pokémon tries again.
        request.catch(() => movesCache.delete(pokemonId));
        movesCache.set(pokemonId, request);
    }
    return request;
}

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

export async function loadTcgCardCatalog(): Promise<Record<string, TcgCard[]>> {
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

let tcgSetNameCache: Record<string, string> | null = null;

// Synchronous reads of TCG data that is already loaded (null if not yet), so the TCG tab can
// render cards on its first frame instead of flashing a spinner after every Pokémon switch.
export function isTcgCardCatalogLoaded(): boolean {
    return tcgCardCache !== null;
}

export function getLoadedTcgCards(pokemonName: string): TcgCard[] | null {
    return tcgCardCache ? tcgCardCache[pokemonName.toLowerCase()] ?? [] : null;
}

// Forms that have cards of their own. English cards are told apart by name; Japanese ones carry
// the form (card.form). Tauros' Combat/Blaze/Aqua breeds are its Paldean forms.
const FORM_CARD_RULES: { formId: RegExp; cardName: RegExp; cardForms: TcgCardForm[] }[] = [
    { formId: /-alola/, cardName: /^Alolan /i, cardForms: ['alola'] },
    { formId: /-galar/, cardName: /^Galarian /i, cardForms: ['galar'] },
    { formId: /-hisui/, cardName: /^Hisuian /i, cardForms: ['hisui'] },
    { formId: /-(paldea|combat|blaze|aqua)/, cardName: /^Paldean /i, cardForms: ['paldea'] },
    { formId: /-mega/, cardName: /^(M|Mega) /i, cardForms: ['mega', 'mega-x', 'mega-y'] },
    { formId: /-primal/, cardName: /^Primal /i, cardForms: ['primal'] },
    { formId: /-gmax/, cardName: /VMAX/, cardForms: ['gmax'] },
];

const cardIsForm = (card: TcgCard, rule: (typeof FORM_CARD_RULES)[number]) =>
    card.form ? rule.cardForms.includes(card.form) : card.lang !== 'ja' && rule.cardName.test(card.name);

// Mega X / Mega Y: an English name says " X "/" Y ", a Japanese card says it in card.form.
const isMegaOf = (card: TcgCard, side: 'X' | 'Y') =>
    card.form === `mega-${side.toLowerCase()}` || new RegExp(` ${side} `, 'i').test(card.name);

let formIdsByDex: Map<string, string[]> | null = null;

function speciesFormIds(dexNumberFormatted: string): string[] {
    if (!formIdsByDex && pokemonCache) {
        formIdsByDex = new Map();
        for (const p of pokemonCache) {
            const ids = formIdsByDex.get(p.dexNumberFormatted);
            if (ids) ids.push(p.id);
            else formIdsByDex.set(p.dexNumberFormatted, [p.id]);
        }
    }
    return formIdsByDex?.get(dexNumberFormatted) ?? [];
}

// Cards are keyed by species name, so each form picks its own out of the species' cards:
// - a regional, Mega, Primal or Gigantamax form keeps only its cards ("Alolan …", "M …"/"Mega …"
//   with X or Y, "Primal …", VMAX);
// - any other entry leaves out the cards of those forms, unless "Exclude forms" is on, since the
//   forms then aren't listed apart and the species entry stands for all of them.
// Used by the TCG tab and by the card count next to the tab, so both always agree.
export function cardsForForm(
    cards: TcgCard[],
    pokemon: Pick<PokemonSummary, 'id' | 'formName' | 'dexNumberFormatted'>,
    excludeForms: boolean,
): TcgCard[] {
    const ownRule = FORM_CARD_RULES.find(rule => rule.formId.test(pokemon.id));
    if (ownRule) {
        const formCards = cards.filter(c => cardIsForm(c, ownRule));
        if (/ X$/i.test(pokemon.formName ?? '')) return formCards.filter(c => !isMegaOf(c, 'Y'));
        if (/ Y$/i.test(pokemon.formName ?? '')) return formCards.filter(c => !isMegaOf(c, 'X'));
        return formCards;
    }
    if (excludeForms) return cards;
    const formIds = speciesFormIds(pokemon.dexNumberFormatted);
    const otherFormRules = FORM_CARD_RULES.filter(rule => formIds.some(id => rule.formId.test(id)));
    return cards.filter(c => !otherFormRules.some(rule => cardIsForm(c, rule)));
}

export function getLoadedTcgSetNames(): Record<string, string> | null {
    return tcgSetNameCache;
}

// { setId: setName } — lets the TCG tab search by set name. Missing file just means no set names.
export async function loadTcgSetNames(): Promise<Record<string, string>> {
    if (tcgSetNameCache !== null) return tcgSetNameCache;
    try {
        const res = await fetch(`${BASE}data/tcg-sets.json`);
        tcgSetNameCache = res.ok ? ((await res.json()) as Record<string, string>) : {};
    } catch {
        tcgSetNameCache = {};
    }
    return tcgSetNameCache;
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
    types?: PokemonTypeFilterId[]; // OR — empty/undefined = no filter; LEGENDARY/MYTHICAL/STARTER match species flags, not `types`
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
    const matchesTypeFilter = (p: Pokemon, id: PokemonTypeFilterId): boolean => {
        switch (id) {
            case 'LEGENDARY': return !!p.legendary;
            case 'MYTHICAL': return !!p.mythical;
            case 'STARTER': return !!p.starter;
            default: return p.types.includes(id);
        }
    };
    const matchesOtherFilters = (p: Pokemon): boolean => {
        if (q && !matchesSearch(p, q)) return false;
        if (types?.length && !types.some(t => matchesTypeFilter(p, t))) return false;
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
