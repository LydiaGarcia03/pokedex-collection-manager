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
    fullyEvolved?: boolean;
    capableOfMegaEvolution?: boolean;
}

// Full detail — only loaded when a modal is opened
export interface Pokemon extends PokemonSummary {
    abilities?: string[];
    moves?: string[];
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

    // Learnsets (null until generate-pokedata.mjs is run)
    levelUpMoves?: PokemonMoveDetail[] | null;
    machineMoves?: PokemonMoveDetail[] | null;

    // Type effectiveness — only non-1.0 entries
    typeEffectiveness?: Record<string, number> | null;

    // Natures that increase the Pokémon's highest base stat (excluding HP)
    natures?: string[] | null;

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
}

export interface MegaEvolution {
    item: string;
    megaPokemon: string;
}

// TCG card from backend (sourced from TCGdex)
export interface TcgCard {
    id: string;
    name: string;
    number: string | null;
    imageUrl: string | null;
    setId: string | null;
}

export interface TcgCardsApiResponse {
    cards: TcgCard[];
    dataUnavailable: boolean;
}
