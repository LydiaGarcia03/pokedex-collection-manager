import { useEffect, useState } from 'react';
import { parseCollectionText } from '../utils/collectionFormat';
import type { SelectedCard } from '../types/Pokemon';

const STORAGE_KEY = 'pokedex.collection.v2';
const LEGACY_STORAGE_KEY = 'pokedex.collection.ids';

export interface CollectionState {
    selectedPokemonIds: string[];
    selectedGamesByPokemonId: Record<string, string[]>;
    selectedCardsByPokemonId: Record<string, SelectedCard[]>;
}

export interface CollectionImportResult {
    pokemonCount: number;
    gameCount: number;
    cardCount: number;
    foilCount: number;
    invalidLines: string[];
}

const INITIAL_COLLECTION_STATE: CollectionState = {
    selectedPokemonIds: [],
    selectedGamesByPokemonId: {},
    selectedCardsByPokemonId: {}
};

function addUnique(list: string[], id: string) {
    return list.includes(id) ? list : [...list, id];
}

function removeId(list: string[], id: string) {
    return list.filter(item => item !== id);
}

function toggleId(list: string[], id: string) {
    return list.includes(id)
        ? removeId(list, id)
        : [...list, id];
}

/**
 * Accepts both the current `{id, foil}[]` shape and the legacy plain
 * `string[]` shape (from localStorage/Firestore data saved before foil
 * tracking existed), normalizing either into `SelectedCard[]`.
 */
function normalizeSelectedCards(raw: unknown): Record<string, SelectedCard[]> {
    if (!raw || typeof raw !== 'object') return {};

    const result: Record<string, SelectedCard[]> = {};

    for (const [pokemonId, entries] of Object.entries(raw as Record<string, unknown>)) {
        if (!Array.isArray(entries)) continue;

        result[pokemonId] = entries
            .map((entry): SelectedCard | null => {
                if (typeof entry === 'string') return { id: entry, foil: false };
                if (entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string') {
                    return { id: (entry as { id: string }).id, foil: (entry as { foil?: unknown }).foil === true };
                }
                return null;
            })
            .filter((entry): entry is SelectedCard => entry !== null);
    }

    return result;
}

function readCollectionState(): CollectionState {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
        try {
            const parsed = JSON.parse(stored) as Partial<CollectionState>;

            return {
                selectedPokemonIds: parsed.selectedPokemonIds ?? [],
                selectedGamesByPokemonId: parsed.selectedGamesByPokemonId ?? {},
                selectedCardsByPokemonId: normalizeSelectedCards(parsed.selectedCardsByPokemonId)
            };
        } catch {
            return INITIAL_COLLECTION_STATE;
        }
    }

    const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);

    if (legacyStored) {
        try {
            const legacyIds = JSON.parse(legacyStored) as string[];

            if (Array.isArray(legacyIds)) {
                return {
                    ...INITIAL_COLLECTION_STATE,
                    selectedPokemonIds: legacyIds
                };
            }
        } catch {
            return INITIAL_COLLECTION_STATE;
        }
    }

    return INITIAL_COLLECTION_STATE;
}

export function useCollection() {
    const [state, setState] = useState<CollectionState>(() => readCollectionState());

    /**
     * IDs de Pokémon que foram desmarcados, mas cujas seleções internas
     * de jogos/cartas ainda estão salvas temporariamente.
     *
     * Elas serão apagadas quando:
     * - o mouse sair do card;
     * - o modal fechar;
     * - o usuário navegar para outro Pokémon no modal.
     */
    const [pendingCleanupIds, setPendingCleanupIds] = useState<string[]>([]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    function isPokemonSelected(pokemonId: string) {
        return state.selectedPokemonIds.includes(pokemonId);
    }

    function togglePokemon(pokemonId: string) {
        const selectedNow = state.selectedPokemonIds.includes(pokemonId);

        setState(current => ({
            ...current,
            selectedPokemonIds: selectedNow
                ? removeId(current.selectedPokemonIds, pokemonId)
                : addUnique(current.selectedPokemonIds, pokemonId)
        }));

        setPendingCleanupIds(current => {
            if (selectedNow) {
                return addUnique(current, pokemonId);
            }

            return removeId(current, pokemonId);
        });
    }

    function commitPendingCleanup(pokemonId: string) {
        setPendingCleanupIds(currentPendingIds => {
            if (!currentPendingIds.includes(pokemonId)) {
                return currentPendingIds;
            }

            setState(current => {
                if (current.selectedPokemonIds.includes(pokemonId)) {
                    return current;
                }

                const selectedGamesByPokemonId = {
                    ...current.selectedGamesByPokemonId
                };

                const selectedCardsByPokemonId = {
                    ...current.selectedCardsByPokemonId
                };

                delete selectedGamesByPokemonId[pokemonId];
                delete selectedCardsByPokemonId[pokemonId];

                return {
                    ...current,
                    selectedGamesByPokemonId,
                    selectedCardsByPokemonId
                };
            });

            return removeId(currentPendingIds, pokemonId);
        });
    }

    function getSelectedGameIds(pokemonId: string) {
        return state.selectedGamesByPokemonId[pokemonId] ?? [];
    }

    function isGameSelected(pokemonId: string, gameId: string) {
        return getSelectedGameIds(pokemonId).includes(gameId);
    }

    function toggleGame(pokemonId: string, gameId: string) {
        setState(current => {
            if (!current.selectedPokemonIds.includes(pokemonId)) {
                return current;
            }

            const currentGameIds = current.selectedGamesByPokemonId[pokemonId] ?? [];

            return {
                ...current,
                selectedGamesByPokemonId: {
                    ...current.selectedGamesByPokemonId,
                    [pokemonId]: toggleId(currentGameIds, gameId)
                }
            };
        });
    }

    function getSelectedCardEntries(pokemonId: string) {
        return state.selectedCardsByPokemonId[pokemonId] ?? [];
    }

    function getSelectedCardIds(pokemonId: string) {
        return getSelectedCardEntries(pokemonId).map(card => card.id);
    }

    function isCardSelected(pokemonId: string, cardId: string) {
        return getSelectedCardEntries(pokemonId).some(card => card.id === cardId);
    }

    function getFoilCardIds(pokemonId: string) {
        return getSelectedCardEntries(pokemonId).filter(card => card.foil).map(card => card.id);
    }

    function isCardFoil(pokemonId: string, cardId: string) {
        return getSelectedCardEntries(pokemonId).some(card => card.id === cardId && card.foil);
    }

    function toggleCard(pokemonId: string, cardId: string) {
        setState(current => {
            if (!current.selectedPokemonIds.includes(pokemonId)) {
                return current;
            }

            const currentCards = current.selectedCardsByPokemonId[pokemonId] ?? [];
            const isSelected = currentCards.some(card => card.id === cardId);

            const nextCards = isSelected
                ? currentCards.filter(card => card.id !== cardId)
                : [...currentCards, { id: cardId, foil: false }];

            return {
                ...current,
                selectedCardsByPokemonId: {
                    ...current.selectedCardsByPokemonId,
                    [pokemonId]: nextCards
                }
            };
        });
    }

    function toggleFoil(pokemonId: string, cardId: string) {
        setState(current => {
            const currentCards = current.selectedCardsByPokemonId[pokemonId] ?? [];

            if (!currentCards.some(card => card.id === cardId)) {
                return current;
            }

            return {
                ...current,
                selectedCardsByPokemonId: {
                    ...current.selectedCardsByPokemonId,
                    [pokemonId]: currentCards.map(card =>
                        card.id === cardId ? { ...card, foil: !card.foil } : card
                    )
                }
            };
        });
    }

    function replacePokemonSelection(pokemonIds: string[]) {
        setState(current => ({
            ...current,
            selectedPokemonIds: pokemonIds
        }));

        setPendingCleanupIds([]);
    }

    function clear() {
        setState(INITIAL_COLLECTION_STATE);
        setPendingCleanupIds([]);
    }

    function importFromText(content: string): CollectionImportResult | null {
        const parsed = parseCollectionText(content);
        if (!parsed) return null;

        setState({
            selectedPokemonIds: parsed.selectedPokemonIds,
            selectedGamesByPokemonId: parsed.selectedGamesByPokemonId,
            selectedCardsByPokemonId: parsed.selectedCardsByPokemonId,
        });
        setPendingCleanupIds([]);

        return {
            pokemonCount: parsed.pokemonCount,
            gameCount: parsed.gameCount,
            cardCount: parsed.cardCount,
            foilCount: parsed.foilCount,
            invalidLines: parsed.invalidLines,
        };
    }

    function exportAsJson(): string {
        return JSON.stringify(state);
    }

    function importFromJson(jsonString: string): boolean {
        try {
            const parsed = JSON.parse(jsonString) as Partial<CollectionState>;
            setState({
                selectedPokemonIds: parsed.selectedPokemonIds ?? [],
                selectedGamesByPokemonId: parsed.selectedGamesByPokemonId ?? {},
                selectedCardsByPokemonId: normalizeSelectedCards(parsed.selectedCardsByPokemonId),
            });
            setPendingCleanupIds([]);
            return true;
        } catch {
            return false;
        }
    }

    return {
        state,

        selectedIds: state.selectedPokemonIds,
        selectedPokemonIds: state.selectedPokemonIds,

        selectedGamesByPokemonId: state.selectedGamesByPokemonId,
        selectedCardsByPokemonId: state.selectedCardsByPokemonId,

        isSelected: isPokemonSelected,
        isPokemonSelected,
        toggle: togglePokemon,
        togglePokemon,

        pendingCleanupIds,
        commitPendingCleanup,

        getSelectedGameIds,
        isGameSelected,
        toggleGame,

        getSelectedCardIds,
        isCardSelected,
        toggleCard,

        getFoilCardIds,
        isCardFoil,
        toggleFoil,

        replacePokemonSelection,
        clear,

        importFromText,
        exportAsJson,
        importFromJson,
    };
}

export type UseCollectionReturn = ReturnType<typeof useCollection>;