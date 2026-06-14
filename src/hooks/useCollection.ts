import { useEffect, useState } from 'react';
import { parseCollectionText } from '../utils/collectionFormat';

const STORAGE_KEY = 'pokedex.collection.v2';
const LEGACY_STORAGE_KEY = 'pokedex.collection.ids';

export interface CollectionState {
    selectedPokemonIds: string[];
    selectedGamesByPokemonId: Record<string, string[]>;
    selectedCardsByPokemonId: Record<string, string[]>;
}

export interface CollectionImportResult {
    pokemonCount: number;
    gameCount: number;
    cardCount: number;
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

function readCollectionState(): CollectionState {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
        try {
            const parsed = JSON.parse(stored) as Partial<CollectionState>;

            return {
                selectedPokemonIds: parsed.selectedPokemonIds ?? [],
                selectedGamesByPokemonId: parsed.selectedGamesByPokemonId ?? {},
                selectedCardsByPokemonId: parsed.selectedCardsByPokemonId ?? {}
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

    function getSelectedCardIds(pokemonId: string) {
        return state.selectedCardsByPokemonId[pokemonId] ?? [];
    }

    function isCardSelected(pokemonId: string, cardId: string) {
        return getSelectedCardIds(pokemonId).includes(cardId);
    }

    function toggleCard(pokemonId: string, cardId: string) {
        setState(current => {
            if (!current.selectedPokemonIds.includes(pokemonId)) {
                return current;
            }

            const currentCardIds = current.selectedCardsByPokemonId[pokemonId] ?? [];

            return {
                ...current,
                selectedCardsByPokemonId: {
                    ...current.selectedCardsByPokemonId,
                    [pokemonId]: toggleId(currentCardIds, cardId)
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
            invalidLines: parsed.invalidLines,
        };
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

        replacePokemonSelection,
        clear,

        importFromText,
    };
}

export type UseCollectionReturn = ReturnType<typeof useCollection>;