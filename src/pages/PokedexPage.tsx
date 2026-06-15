import { ChevronDown, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchTcgCards, filterPokemon, loadAllPokemon } from '../api/pokemonApi';
import { ExportContentModal } from '../components/ExportContentModal';
import { ExportTypeModal } from '../components/ExportTypeModal';
import { ImportCollectionModal } from '../components/ImportCollectionModal';
import { PokemonCard } from '../components/PokemonCard';
import { PokemonModal } from '../components/PokemonModal';
import { useCollection } from '../hooks/useCollection';
import type { Pokemon, PokemonSummary, TcgCard } from '../types/Pokemon';
import { buildExportText, type ExportType } from '../utils/collectionFormat';

type ExportStep = 'closed' | 'type' | 'loading' | 'content';

const GEN_LABELS: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX',
};

export function PokedexPage() {
    // All Pokémon loaded once at startup from pokemon-compiled.json
    const [allPokemon, setAllPokemon] = useState<Pokemon[]>([]);
    // Detail cache: populated synchronously from allPokemon when a modal opens
    const [detailCache, setDetailCache] = useState<Record<string, Pokemon>>({});
    const [activePokemonIndex, setActivePokemonIndex] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [exportStep, setExportStep] = useState<ExportStep>('closed');
    const [exportContent, setExportContent] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null);
    const [genDropdownOpen, setGenDropdownOpen] = useState(false);
    const genDropdownRef = useRef<HTMLDivElement>(null);
    const [collectionVisible, setCollectionVisible] = useState(false);

    // Ref used in export to order selected Pokémon — always the full unfiltered list
    const allPokemonRef = useRef<Pokemon[]>([]);

    const collection = useCollection();

    // Load all Pokémon data once on mount
    useEffect(() => {
        loadAllPokemon().then(data => {
            setAllPokemon(data);
            allPokemonRef.current = data;
        });
    }, []);

    // Debounce search input (250ms — matches original backend debounce)
    useEffect(() => {
        const id = window.setTimeout(() => setDebouncedSearch(search), 250);
        return () => window.clearTimeout(id);
    }, [search]);

    // Close generation dropdown when clicking outside
    useEffect(() => {
        function handleOutsideClick(e: MouseEvent) {
            if (genDropdownRef.current && !genDropdownRef.current.contains(e.target as Node)) {
                setGenDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // Client-side filtering — same logic as PokemonSearchFilter.java
    const summaries: PokemonSummary[] = useMemo(
        () => filterPokemon(allPokemon, debouncedSearch, null, selectedGeneration),
        [allPokemon, debouncedSearch, selectedGeneration]
    );

    const activeSummary = activePokemonIndex !== null ? summaries[activePokemonIndex] ?? null : null;
    const activePokemonDetail = activeSummary ? detailCache[activeSummary.id] ?? null : null;
    // No async detail fetch in static version — data is already in allPokemon
    const detailLoading = false;

    useEffect(() => {
        if (activePokemonIndex !== null && activePokemonIndex >= summaries.length) {
            setActivePokemonIndex(null);
        }
    }, [activePokemonIndex, summaries.length]);

    function handleOpenModal(index: number) {
        const summary = summaries[index];
        if (!summary) return;

        setActivePokemonIndex(index);

        // Populate detail cache synchronously from pre-loaded data
        if (!detailCache[summary.id]) {
            const detail = allPokemon.find(p => p.id === summary.id);
            if (detail) {
                setDetailCache(prev => ({ ...prev, [summary.id]: detail }));
            }
        }
    }

    function handleCloseModal() {
        setActivePokemonIndex(null);
    }

    function handleClearAll() {
        collection.clear();
        setShowClearConfirm(false);
    }

    async function handleExportContinue(type: ExportType) {
        setExportStep('loading');

        let tcgCardsByPokemonId: Record<string, TcgCard[]> | undefined;

        if (type === 'cards') {
            const pokemonWithCards = collection.selectedPokemonIds.filter(
                id => (collection.selectedCardsByPokemonId[id]?.length ?? 0) > 0
            );

            if (pokemonWithCards.length > 0) {
                tcgCardsByPokemonId = {};
                await Promise.all(
                    pokemonWithCards.map(async id => {
                        // Look up the Pokémon name by ID so fetchTcgCards can find the right bucket
                        const pokemon = allPokemonRef.current.find(p => p.id === id);
                        if (!pokemon) return;
                        const response = await fetchTcgCards(pokemon.name);
                        tcgCardsByPokemonId![id] = response.cards;
                    })
                );
            }
        }

        const content = buildExportText({
            type,
            selectedPokemonIds: collection.selectedPokemonIds,
            selectedGamesByPokemonId: collection.selectedGamesByPokemonId,
            selectedCardsByPokemonId: collection.selectedCardsByPokemonId,
            // Use the full unfiltered list so export order is always correct
            summaries: allPokemonRef.current as PokemonSummary[],
            tcgCardsByPokemonId,
        });

        setExportContent(content);
        setExportStep('content');
    }

    function handleImportContent(content: string) {
        return collection.importFromText(content);
    }

    return (
        <main className="pokedex-page">
            <section className="pokedex-toolbar">
                <input
                    className="pokedex-search"
                    type="search"
                    placeholder="Search Pokémon..."
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                />

                <div className="gen-filter" ref={genDropdownRef}>
                    <button
                        type="button"
                        className={`gen-filter__button${selectedGeneration ? ' gen-filter__button--active' : ''}`}
                        onClick={() => setGenDropdownOpen(o => !o)}
                        aria-expanded={genDropdownOpen}
                    >
                        {selectedGeneration ? `Gen ${GEN_LABELS[selectedGeneration]}` : 'All Gens'}
                        <ChevronDown size={14} />
                    </button>

                    {genDropdownOpen && (
                        <div className="gen-filter__dropdown" role="listbox">
                            {([null, 1, 2, 3, 4, 5, 6, 7, 8, 9] as (number | null)[]).map(gen => (
                                <button
                                    key={gen ?? 'all'}
                                    type="button"
                                    role="option"
                                    aria-selected={selectedGeneration === gen}
                                    className={`gen-filter__option${selectedGeneration === gen ? ' gen-filter__option--selected' : ''}`}
                                    onClick={() => { setSelectedGeneration(gen); setGenDropdownOpen(false); }}
                                >
                                    {gen === null ? 'All Gens' : `Gen ${GEN_LABELS[gen]}`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="collection-actions">
                <button
                    type="button"
                    className="collection-action-button"
                    onClick={() => setShowImportModal(true)}
                >
                    Import Collection
                </button>

                <button
                    type="button"
                    className="collection-action-button"
                    onClick={() => setExportStep('type')}
                >
                    Export Collection
                </button>

                <button
                    type="button"
                    className={`collection-action-button ${collectionVisible ? 'collection-action-button--active' : ''}`}
                    onClick={() => setCollectionVisible(v => !v)}
                >
                    Toggle Collection Visibility
                </button>
            </section>

            <div className="pokedex-count-row">
                <div className="pokedex-count">
                    <span>
                        Showing {summaries.length} Pokémon · Selected {collection.selectedPokemonIds.length}
                    </span>
                </div>

                {collection.selectedPokemonIds.length > 0 && (
                    <button
                        type="button"
                        className="clear-all-button"
                        onClick={() => setShowClearConfirm(true)}
                    >
                        <X size={14} />
                        Clear all
                    </button>
                )}
            </div>

            <section className="pokedex-grid">
                {summaries.map((item, index) => (
                    <PokemonCard
                        key={item.id}
                        pokemon={item}
                        selected={collection.isPokemonSelected(item.id)}
                        collectionVisible={collectionVisible}
                        onToggleSelected={collection.togglePokemon}
                        onOpenDetails={() => handleOpenModal(index)}
                        onCommitDeselection={collection.commitPendingCleanup}
                    />
                ))}
            </section>

            <PokemonModal
                pokemonList={summaries}
                activePokemonIndex={activePokemonIndex}
                activePokemonDetail={activePokemonDetail}
                detailLoading={detailLoading}
                onChangePokemon={handleOpenModal}
                onClose={handleCloseModal}
                collection={collection}
                collectionVisible={collectionVisible}
            />

            {showClearConfirm && (
                <div
                    className="clear-confirm-backdrop"
                    role="presentation"
                    onClick={() => setShowClearConfirm(false)}
                >
                    <div
                        className="clear-confirm-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={e => e.stopPropagation()}
                    >
                        <p className="clear-confirm-modal__message">
                            Are you sure you want to clear all selections?
                            <br />
                            <small>This action cannot be undone.</small>
                        </p>

                        <div className="clear-confirm-modal__actions">
                            <button
                                type="button"
                                className="clear-confirm-modal__cancel"
                                onClick={() => setShowClearConfirm(false)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="clear-confirm-modal__confirm"
                                onClick={handleClearAll}
                            >
                                Clear all
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {exportStep === 'type' && (
                <ExportTypeModal
                    onClose={() => setExportStep('closed')}
                    onContinue={handleExportContinue}
                />
            )}

            {exportStep === 'loading' && (
                <div className="collection-loading-overlay" role="status" aria-label="Gerando arquivo...">
                    <span className="collection-loading-overlay__spinner" />
                </div>
            )}

            {exportStep === 'content' && (
                <ExportContentModal
                    content={exportContent}
                    onClose={() => setExportStep('closed')}
                />
            )}

            {showImportModal && (
                <ImportCollectionModal
                    onClose={() => setShowImportModal(false)}
                    onImport={handleImportContent}
                />
            )}
        </main>
    );
}
