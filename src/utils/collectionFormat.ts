import type { PokemonSummary, SelectedCard, TcgCard } from '../types/Pokemon';

export type ExportType = 'games' | 'cards' | 'none';

const FOIL_TAG = '[foil]';

export interface ExportData {
    type: ExportType;
    selectedPokemonIds: string[];
    selectedGamesByPokemonId: Record<string, string[]>;
    selectedCardsByPokemonId: Record<string, SelectedCard[]>;
    summaries: PokemonSummary[];
    tcgCardsByPokemonId?: Record<string, TcgCard[]>;
}

export function buildExportText(data: ExportData): string {
    const {
        type,
        selectedPokemonIds,
        selectedGamesByPokemonId,
        selectedCardsByPokemonId,
        summaries,
        tcgCardsByPokemonId,
    } = data;

    const header =
        type === 'games' ? 'GAME COLLECTION' :
        type === 'cards' ? 'CARD COLLECTION' :
        'NO SPECIFICATION';

    const lines: string[] = [
        header,
        `# exportedAt=${new Date().toISOString()}`,
        '',
    ];

    const selectedSet = new Set(selectedPokemonIds);
    const ordered = summaries.filter(s => selectedSet.has(s.id));

    for (const pokemon of ordered) {
        const displayName = pokemon.formName
            ? `${pokemon.name} - ${pokemon.formName}`
            : pokemon.name;
        lines.push(`${displayName} (#${pokemon.id})`);

        if (type === 'games') {
            const gameIds = selectedGamesByPokemonId[pokemon.id] ?? [];
            if (gameIds.length === 0) {
                lines.push('  No Game Selected');
            } else {
                gameIds.forEach(id => lines.push(`  ${id}`));
            }
        } else if (type === 'cards') {
            const cardEntries = selectedCardsByPokemonId[pokemon.id] ?? [];
            if (cardEntries.length === 0) {
                lines.push('  No Card Selected');
            } else {
                const cards = tcgCardsByPokemonId?.[pokemon.id] ?? [];
                cardEntries.forEach(({ id: cardId, foil }) => {
                    const card = cards.find(c => c.id === cardId);
                    if (card?.name && card.number != null && card.setId != null) {
                        const foilSuffix = foil ? ` ${FOIL_TAG}` : '';
                        lines.push(`  ${card.name} #${card.number} (${card.setId})${foilSuffix} - ${cardId}`);
                    } else {
                        const foilPrefix = foil ? `${FOIL_TAG} ` : '';
                        lines.push(`  ${foilPrefix}${cardId}`);
                    }
                });
            }
        }

        lines.push('');
    }

    return lines.join('\n').trimEnd();
}

export interface ParsedCollection {
    selectedPokemonIds: string[];
    selectedGamesByPokemonId: Record<string, string[]>;
    selectedCardsByPokemonId: Record<string, SelectedCard[]>;
    pokemonCount: number;
    gameCount: number;
    cardCount: number;
    foilCount: number;
    invalidLines: string[];
}

export function parseCollectionText(content: string): ParsedCollection | null {
    const lines = content.split(/\r?\n/);
    if (!lines.length) return null;

    const header = lines[0].trim();
    let type: ExportType;
    if (header === 'GAME COLLECTION') type = 'games';
    else if (header === 'CARD COLLECTION') type = 'cards';
    else if (header === 'NO SPECIFICATION') type = 'none';
    else return null;

    const selectedPokemonIds: string[] = [];
    const selectedGamesByPokemonId: Record<string, string[]> = {};
    const selectedCardsByPokemonId: Record<string, SelectedCard[]> = {};
    const invalidLines: string[] = [];

    let currentId: string | null = null;

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        if (!line || line.startsWith('#') || line.trim() === header) continue;

        const isIndented = line.startsWith('  ') || line.startsWith('\t');

        if (!isIndented) {
            const match = line.match(/\(#([^)]+)\)\s*$/);
            if (match) {
                currentId = match[1];
                if (!selectedPokemonIds.includes(currentId)) {
                    selectedPokemonIds.push(currentId);
                }
            } else {
                invalidLines.push(rawLine);
                currentId = null;
            }
        } else if (currentId) {
            const child = line.trim();
            if (!child || child === 'No Game Selected' || child === 'No Card Selected') continue;

            if (type === 'games') {
                if (!selectedGamesByPokemonId[currentId]) selectedGamesByPokemonId[currentId] = [];
                if (!selectedGamesByPokemonId[currentId].includes(child)) {
                    selectedGamesByPokemonId[currentId].push(child);
                }
            } else if (type === 'cards') {
                const isFoil = child.includes(FOIL_TAG);
                const cleaned = isFoil
                    ? child.split(FOIL_TAG).join('').replace(/\s+/g, ' ').trim()
                    : child;

                const sep = cleaned.lastIndexOf(' - ');
                const cardId = sep >= 0 ? cleaned.slice(sep + 3).trim() : cleaned;
                if (cardId) {
                    if (!selectedCardsByPokemonId[currentId]) selectedCardsByPokemonId[currentId] = [];
                    if (!selectedCardsByPokemonId[currentId].some(card => card.id === cardId)) {
                        selectedCardsByPokemonId[currentId].push({ id: cardId, foil: isFoil });
                    }
                } else {
                    invalidLines.push(rawLine);
                }
            }
        }
    }

    return {
        selectedPokemonIds,
        selectedGamesByPokemonId,
        selectedCardsByPokemonId,
        pokemonCount: selectedPokemonIds.length,
        gameCount: Object.values(selectedGamesByPokemonId).flat().length,
        cardCount: Object.values(selectedCardsByPokemonId).flat().length,
        foilCount: Object.values(selectedCardsByPokemonId).flat().filter(card => card.foil).length,
        invalidLines,
    };
}
