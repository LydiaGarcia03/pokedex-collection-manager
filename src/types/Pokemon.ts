export type PokemonType =
    | 'NORMAL'
    | 'FIRE'
    | 'WATER'
    | 'GRASS'
    | 'ELECTRIC'
    | 'ICE'
    | 'FIGHTING'
    | 'POISON'
    | 'GROUND'
    | 'FLYING'
    | 'PSYCHIC'
    | 'BUG'
    | 'ROCK'
    | 'GHOST'
    | 'DRAGON'
    | 'DARK'
    | 'STEEL'
    | 'FAIRY';

// Real elemental types, plus the species-level pseudo-categories the Type filter also
// lets you select (matched against `legendary`/`mythical`/`starter`, not `types`).
export type PokemonTypeFilterId = PokemonType | 'LEGENDARY' | 'MYTHICAL' | 'STARTER';

// Lightweight — used for the grid and modal navigation
export interface PokemonSummary {
    id: string;
    dexNumber: number;
    dexNumberFormatted: string;
    name: string;
    formName?: string | null;
    imageCode: string;
    imageUrl: string;
    imageUrlXl?: string;
    types: PokemonType[];
    region?: string | null;
    legendary?: boolean;
    mythical?: boolean;
    starter?: boolean;
    fullyEvolved?: boolean;
    capableOfMegaEvolution?: boolean;
}

// One Pokémon's moves — kept out of pokemon-compiled.json, loaded when its detail opens
// (public/data/moves/{id}.json, see loadPokemonMoves). Learnsets are null until
// generate-pokedata.mjs is run in the pokedex project.
export interface PokemonMoves {
    moves?: string[];
    levelUpMoves?: PokemonMoveDetail[] | null;
    machineMoves?: PokemonMoveDetail[] | null;
}

// Full detail — only loaded when a modal is opened
export interface Pokemon extends PokemonSummary {
    abilities?: string[];
    previousEvolution?: string | null;
    nextEvolution?: string | null;
    megaEvolutions?: MegaEvolution[];

    // Base stats (null until generate-pokedata.mjs is run)
    hp?: number | null;
    attack?: number | null;
    defense?: number | null;
    specialAttack?: number | null;
    specialDefense?: number | null;
    speed?: number | null;

    // Physical / profile (null until generate-pokedata.mjs is run)
    height?: number | null;
    weight?: number | null;
    color?: string | null;
    maleRate?: number | null;
    femaleRate?: number | null;
    generation?: number | null;

    // Species characteristics (null until generate-pokedata.mjs is run)
    genus?: string | null;
    flavorText?: string | null;
    captureRate?: number | null;
    baseHappiness?: number | null;
    growthRate?: string | null;
    habitat?: string | null;
    eggGroups?: string[] | null;

    // Type effectiveness — only non-1.0 entries
    typeEffectiveness?: Record<string, number> | null;

    // Top 3 best-fit natures, derived from base stats (no nature is "assigned" to a species)
    recommendedNatures?: RecommendedNature[] | null;

    moveProgress?: PokemonMoveProgress[] | null;
    games?: PokemonGame[] | null;
}

export interface PokemonMoveDetail {
    levelOrTm: string;
    moveSlug: string;
    moveName: string;
    type?: string | null;
    category?: string | null;
    power?: number | null;
    accuracy?: number | null;
    shortEffect?: string | null;
}

export interface RecommendedNature {
    name: string;
    increasedStat: string;
    decreasedStat: string;
}

export interface PokemonMoveProgress {
    id: string;
    label: string;
    current: number;
    total: number;
}

export interface PokemonGame {
    id: string;
    name: string;
    iconUrl?: string | null;
    generation?: number | null;
    dlc?: { id: string; name: string }[] | null;
    inBaseDex?: boolean;
}

export interface MegaEvolution {
    item: string;
    megaPokemon: string;
}

// TCG card from backend (sourced from TCGdex)
// Forms with cards of their own (see cardsForForm in src/api/pokemonApi.ts).
export type TcgCardForm = 'alola' | 'galar' | 'hisui' | 'paldea' | 'mega' | 'mega-x' | 'mega-y' | 'primal' | 'gmax';

export interface TcgCard {
    id: string;
    name: string;
    number: string | null;
    imageUrl: string | null;
    setId: string | null;
    /** Only on Japan-exclusive cards (scripts/collect-tcg-japanese.mjs); English otherwise. */
    lang?: 'ja';
    /** Set by the Japanese collector, whose card names the form rules can't read. */
    form?: TcgCardForm;
    /** Art covers the whole card. Set by scripts/tag-tcg-cards.mjs, only when true. */
    fullArt?: boolean;
    /** Card from a promo set (PROMO mark). Set by scripts/tag-tcg-cards.mjs, only when true. */
    promo?: boolean;
}

export interface TcgCardsApiResponse {
    cards: TcgCard[];
    dataUnavailable: boolean;
}

// A card the user has added to their collection, with its foil status
export interface SelectedCard {
    id: string;
    foil: boolean;
}

// The three answers to "Is this card in my collection?" — 'foil' implies owned.
export type CardOwnership = 'none' | 'owned' | 'foil';
