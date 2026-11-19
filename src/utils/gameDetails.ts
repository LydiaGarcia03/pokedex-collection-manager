// Signature color and original (Japanese) release year of each game, for the Games tab swatches
// (option H4 of docs/games-tab-mock.html). Keyed by the game ids of games-catalog.json; a game
// missing here falls back to a neutral color and no year.

interface GameDetails {
    color: string;
    year: number;
}

const GAME_DETAILS: Record<string, GameDetails> = {
    'rb-r': { color: '#e3350d', year: 1996 },
    'rb-b': { color: '#3b5ba7', year: 1996 },
    y: { color: '#f4c430', year: 1998 },
    'gs-g': { color: '#c8a23c', year: 1999 },
    'gs-s': { color: '#9aa2ad', year: 1999 },
    c: { color: '#5fc3dc', year: 2000 },
    'rs-r': { color: '#b3132b', year: 2002 },
    'rs-s': { color: '#1f4fa8', year: 2002 },
    'frlg-fr': { color: '#f05a28', year: 2004 },
    'frlg-lg': { color: '#6abf4b', year: 2004 },
    e: { color: '#2e9b5f', year: 2004 },
    'dp-d': { color: '#5b8fd6', year: 2006 },
    'dp-p': { color: '#d784b0', year: 2006 },
    pt: { color: '#7d8798', year: 2008 },
    'hgss-hg': { color: '#d4a52a', year: 2009 },
    'hgss-ss': { color: '#97a6b8', year: 2009 },
    'bw-b': { color: '#3a3a40', year: 2010 },
    'bw-w': { color: '#c9ccd2', year: 2010 },
    'b2w2-b2': { color: '#40464e', year: 2012 },
    'b2w2-w2': { color: '#b9bec6', year: 2012 },
    'xy-x': { color: '#2f6db5', year: 2013 },
    'xy-y': { color: '#c8343c', year: 2013 },
    'oras-or': { color: '#a2192b', year: 2014 },
    'oras-as': { color: '#1c4b9a', year: 2014 },
    go: { color: '#2e6fd8', year: 2016 },
    'sm-s': { color: '#f2a33a', year: 2016 },
    'sm-m': { color: '#5b5fc7', year: 2016 },
    'usum-us': { color: '#f07b2a', year: 2017 },
    'usum-um': { color: '#6a3fb5', year: 2017 },
    'lgpe-lgp': { color: '#f4c430', year: 2018 },
    'lgpe-lge': { color: '#b07a3c', year: 2018 },
    'swsh-sw': { color: '#3c8fd6', year: 2019 },
    'swsh-sh': { color: '#d6334c', year: 2019 },
    'bdsp-bd': { color: '#4d7fd1', year: 2021 },
    'bdsp-sp': { color: '#d48ab0', year: 2021 },
    la: { color: '#6e8b74', year: 2022 },
    'sv-s': { color: '#d73a33', year: 2022 },
    'sv-v': { color: '#7a4bc4', year: 2022 },
    lza: { color: '#3aa58f', year: 2025 },
};

const FALLBACK_COLOR = '#5b6b85';

export function getGameColor(gameId: string): string {
    return GAME_DETAILS[gameId]?.color ?? FALLBACK_COLOR;
}

export function getGameYear(gameId: string): number | null {
    return GAME_DETAILS[gameId]?.year ?? null;
}
