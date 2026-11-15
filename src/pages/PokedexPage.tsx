import { ChevronDown, ChevronUp, Filter, User as UserIcon, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchTcgCards, filterPokemon, loadAllPokemon } from '../api/pokemonApi';
import { AuthModal } from '../components/AuthModal';
import { ExportContentModal } from '../components/ExportContentModal';
import { ExportTypeModal } from '../components/ExportTypeModal';
import { type CollectionFilter, FilterPanel, type FilterGameGroup } from '../components/FilterPanel';
import { ImportCollectionModal } from '../components/ImportCollectionModal';
import { MyCollectionsModal } from '../components/MyCollectionsModal';
import { PokemonCard } from '../components/PokemonCard';
import { PokemonModal } from '../components/PokemonModal';
import { SaveCollectionModal } from '../components/SaveCollectionModal';
import { UserMenu } from '../components/UserMenu';
import { logout } from '../firebase/auth';
import {
    type CloudCollection,
    deleteCloudCollection,
    listCloudCollections,
    overwriteCloudCollection,
    saveCloudCollection,
} from '../firebase/collections';
import { useAuth } from '../hooks/useAuth';
import { useCollection } from '../hooks/useCollection';
import type { Pokemon, PokemonSummary, PokemonTypeFilterId, TcgCard } from '../types/Pokemon';
import { buildExportText, type ExportType } from '../utils/collectionFormat';

type ExportStep = 'closed' | 'type' | 'loading' | 'content';

interface Toast {
    message: string;
    type: 'success' | 'error';
}

// Sentinel ids for the DLC filter's two non-specific options.
// "Base game" (DLC_NONE_ID) is the default: base-game Pokémon only, no DLC content.
// "All DLCs" (DLC_ALL_ID) removes the DLC restriction entirely: base game + every DLC.
const DLC_NONE_ID = 'none';
const DLC_ALL_ID = 'all';

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
    const [filterGenerations, setFilterGenerations] = useState<number[]>([]);
    const [filterTypes, setFilterTypes] = useState<PokemonTypeFilterId[]>([]);
    const [filterGameIds, setFilterGameIds] = useState<string[]>([]);
    const [filterDlcId, setFilterDlcId] = useState<string>(DLC_NONE_ID);
    const [filterExcludeForms, setFilterExcludeForms] = useState(false);
    const [filterShiny, setFilterShiny] = useState(false);
    const [filterCollection, setFilterCollection] = useState<CollectionFilter>('all');
    // Pokémon whose collection status just changed stay visible under the Owned/Missing filter
    // until the user moves on (mouse/finger leaves the card, the detail closes, or the filter
    // changes) — otherwise a card would vanish right under the finger, and the open detail would
    // jump to another Pokémon (it navigates by list position).
    const [stickyCollectionIds, setStickyCollectionIds] = useState<string[]>([]);
    const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const [collectionVisible, setCollectionVisible] = useState(false);
    const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

    // Cloud / auth state
    const { user } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showMyCollections, setShowMyCollections] = useState(false);
    const [cloudCollections, setCloudCollections] = useState<CloudCollection[]>([]);
    const [cloudLoading, setCloudLoading] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    // Ref used in export to order selected Pokémon — always the full unfiltered list
    const allPokemonRef = useRef<Pokemon[]>([]);

    const collection = useCollection();

    // Scroll-to-top button: appear after scrolling one full viewport
    useEffect(() => {
        function handleScroll() {
            setShowScrollTop(window.scrollY > window.innerHeight);
        }
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-dismiss toast after 4 seconds
    useEffect(() => {
        if (!toast) return;
        const id = window.setTimeout(() => setToast(null), 4000);
        return () => window.clearTimeout(id);
    }, [toast]);

    async function fetchCloudCollections(uid: string) {
        setCloudLoading(true);
        try {
            const cols = await listCloudCollections(uid);
            setCloudCollections(cols);
            return cols;
        } finally {
            setCloudLoading(false);
        }
    }

    async function handleAuthSuccess(isNewUser: boolean) {
        setShowAuthModal(false);
        if (isNewUser) {
            setToast({ message: 'Account created! Welcome to your Pokédex.', type: 'success' });
            return;
        }
        // Load the most recently updated collection automatically
        const uid = (await import('../firebase/auth')).auth.currentUser?.uid;
        if (!uid) return;
        const cols = await fetchCloudCollections(uid);
        if (cols.length === 0) {
            setToast({ message: 'Logged in. No saved collections found.', type: 'success' });
            return;
        }
        const latest = cols[0];
        const ok = collection.importFromJson(latest.data);
        if (ok) {
            setToast({ message: `Collection "${latest.name}" loaded from the cloud.`, type: 'success' });
        } else {
            setToast({ message: `Logged in. Could not auto-load "${latest.name}".`, type: 'error' });
        }
    }

    async function handleLogout() {
        await logout();
        setCloudCollections([]);
        setToast({ message: 'Logged out.', type: 'success' });
    }

    async function handleOpenMyCollections() {
        if (!user) return;
        setShowMyCollections(true);
        await fetchCloudCollections(user.uid);
    }

    async function handleOpenSaveModal() {
        if (!user) return;
        setShowSaveModal(true);
        if (cloudCollections.length === 0) {
            await fetchCloudCollections(user.uid);
        }
    }

    async function handleSaveNew(name: string) {
        if (!user) return;
        const data = collection.exportAsJson();
        const id = await saveCloudCollection(user.uid, name, data);
        setCloudCollections(prev => [{
            id,
            name,
            data,
            createdAt: new Date(),
            updatedAt: new Date(),
        }, ...prev]);
        setToast({ message: `Collection "${name}" saved to the cloud.`, type: 'success' });
    }

    async function handleOverwrite(collectionId: string) {
        if (!user) return;
        const data = collection.exportAsJson();
        await overwriteCloudCollection(user.uid, collectionId, data);
        setCloudCollections(prev => prev.map(c =>
            c.id === collectionId ? { ...c, data, updatedAt: new Date() } : c
        ));
        const name = cloudCollections.find(c => c.id === collectionId)?.name ?? '';
        setToast({ message: `Collection "${name}" updated.`, type: 'success' });
    }

    async function handleDeleteCloud(collectionId: string) {
        if (!user) return;
        await deleteCloudCollection(user.uid, collectionId);
        setCloudCollections(prev => prev.filter(c => c.id !== collectionId));
    }

    function handleLoadCloud(data: string, name: string) {
        const ok = collection.importFromJson(data);
        if (ok) {
            setToast({ message: `Collection "${name}" loaded.`, type: 'success' });
        } else {
            setToast({ message: `Failed to load "${name}".`, type: 'error' });
        }
    }

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

    // Close filter dropdown when clicking outside
    useEffect(() => {
        function handleOutsideClick(e: MouseEvent) {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
                setFilterDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // Unique games available across all Pokémon, grouped by generation for the filter panel
    const gameGroups: FilterGameGroup[] = useMemo(() => {
        const seen = new Map<string, { id: string; name: string; iconUrl: string | null; generation: number }>();
        for (const p of allPokemon) {
            for (const g of p.games ?? []) {
                if (!seen.has(g.id) && g.generation != null) {
                    seen.set(g.id, { id: g.id, name: g.name, iconUrl: g.iconUrl ?? null, generation: g.generation });
                }
            }
        }
        const groups = new Map<number, FilterGameGroup['games']>();
        for (const { generation, ...game } of seen.values()) {
            const list = groups.get(generation) ?? [];
            list.push(game);
            groups.set(generation, list);
        }
        return [...groups.entries()].sort(([a], [b]) => a - b).map(([generation, games]) => ({ generation, games }));
    }, [allPokemon]);

    // DLC options for the currently selected game — only meaningful when exactly one game is
    // selected and that game has known DLCs (Sword/Shield, Scarlet/Violet).
    const dlcOptionsForSelectedGame = useMemo(() => {
        if (filterGameIds.length !== 1) return [];
        const seen = new Map<string, { id: string; name: string }>();
        for (const p of allPokemon) {
            const game = p.games?.find(g => g.id === filterGameIds[0]);
            for (const d of game?.dlc ?? []) {
                if (!seen.has(d.id)) seen.set(d.id, d);
            }
        }
        return [...seen.values()];
    }, [allPokemon, filterGameIds]);

    const dlcApplicable = dlcOptionsForSelectedGame.length > 0;

    const dlcOptions = useMemo(
        () => [
            { id: DLC_NONE_ID, label: 'Base game' },
            { id: DLC_ALL_ID, label: 'All DLCs' },
            ...dlcOptionsForSelectedGame.map(d => ({ id: d.id, label: d.name })),
        ],
        [dlcOptionsForSelectedGame]
    );

    // Reset back to "Base game" (the default) whenever the current game selection no longer has
    // any DLC to filter by.
    useEffect(() => {
        if (!dlcApplicable && filterDlcId !== DLC_NONE_ID) setFilterDlcId(DLC_NONE_ID);
    }, [dlcApplicable, filterDlcId]);

    const activeFilterCount =
        (filterGenerations.length > 0 ? 1 : 0) + (filterTypes.length > 0 ? 1 : 0) + (filterGameIds.length > 0 ? 1 : 0)
        + (dlcApplicable && filterDlcId !== DLC_NONE_ID ? 1 : 0) + (filterExcludeForms ? 1 : 0)
        + (filterCollection !== 'all' ? 1 : 0);
    const hasActiveFilterPanel = activeFilterCount > 0 || filterShiny;

    function toggleFilterGeneration(gen: number) {
        setFilterGenerations(prev => prev.includes(gen) ? prev.filter(g => g !== gen) : [...prev, gen]);
    }

    function toggleFilterType(type: PokemonTypeFilterId) {
        setFilterTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    }

    function toggleFilterGame(gameId: string) {
        setFilterGameIds(prev => prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]);
    }

    function toggleFilterDlc(dlcId: string) {
        setFilterDlcId(dlcId);
    }

    const closeFilterPanel = useCallback(() => setFilterDropdownOpen(false), []);

    function clearFilters() {
        setFilterGenerations([]);
        setFilterTypes([]);
        setFilterGameIds([]);
        setFilterDlcId(DLC_NONE_ID);
        setFilterExcludeForms(false);
        setFilterShiny(false);
        changeFilterCollection('all');
    }

    function changeFilterCollection(value: CollectionFilter) {
        setFilterCollection(value);
        setStickyCollectionIds([]);
    }

    // Client-side filtering — same logic as PokemonSearchFilter.java
    const attributeFiltered: PokemonSummary[] = useMemo(
        () => filterPokemon(allPokemon, debouncedSearch, {
            types: filterTypes,
            generations: filterGenerations,
            gameIds: filterGameIds,
            dlcId: dlcApplicable && filterDlcId !== DLC_NONE_ID && filterDlcId !== DLC_ALL_ID ? filterDlcId : null,
            dlcBaseOnly: dlcApplicable && filterDlcId === DLC_NONE_ID,
            excludeForms: filterExcludeForms,
        }),
        [allPokemon, debouncedSearch, filterTypes, filterGenerations, filterGameIds, filterDlcId, dlcApplicable, filterExcludeForms]
    );

    const selectedPokemonIds = collection.selectedPokemonIds;
    const collectionCounts = useMemo(() => {
        const selectedSet = new Set(selectedPokemonIds);
        const owned = attributeFiltered.filter(p => selectedSet.has(p.id)).length;
        return { all: attributeFiltered.length, owned, missing: attributeFiltered.length - owned };
    }, [attributeFiltered, selectedPokemonIds]);

    const summaries: PokemonSummary[] = useMemo(() => {
        if (filterCollection === 'all') return attributeFiltered;
        const selectedSet = new Set(selectedPokemonIds);
        const stickySet = new Set(stickyCollectionIds);
        const wantOwned = filterCollection === 'owned';
        return attributeFiltered.filter(p => stickySet.has(p.id) || selectedSet.has(p.id) === wantOwned);
    }, [attributeFiltered, filterCollection, selectedPokemonIds, stickyCollectionIds]);

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
        if (filterCollection !== 'all') {
            setStickyCollectionIds(prev => (prev.includes(summary.id) ? prev : [...prev, summary.id]));
        }

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
        setStickyCollectionIds([]);
    }

    // Stable callbacks for the memoized PokemonCard grid. useCollection recreates its functions on
    // every render, so the cards call the latest ones through this ref instead.
    const gridHandlersRef = useRef({ collection, handleOpenModal, summaries });
    useEffect(() => {
        gridHandlersRef.current = { collection, handleOpenModal, summaries };
    });
    const handleGridToggleSelected = useCallback((id: string) => {
        gridHandlersRef.current.collection.togglePokemon(id);
        setStickyCollectionIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    }, []);
    const handleGridCommitDeselection = useCallback((id: string) => {
        gridHandlersRef.current.collection.commitPendingCleanup(id);
        setStickyCollectionIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : prev));
    }, []);
    const handleGridOpenDetails = useCallback((id: string) => {
        const { summaries: list, handleOpenModal: open } = gridHandlersRef.current;
        open(list.findIndex(item => item.id === id));
    }, []);

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

                <div className="pokedex-filter" ref={filterDropdownRef}>
                    <button
                        type="button"
                        className={`pokedex-filter__button${activeFilterCount > 0 ? ' pokedex-filter__button--active' : ''}`}
                        onClick={() => setFilterDropdownOpen(o => !o)}
                        aria-expanded={filterDropdownOpen}
                    >
                        <Filter size={14} />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="pokedex-filter__badge">{activeFilterCount}</span>
                        )}
                        <ChevronDown size={14} />
                    </button>

                    {filterDropdownOpen && (
                        <FilterPanel
                            generations={filterGenerations}
                            onToggleGeneration={toggleFilterGeneration}
                            types={filterTypes}
                            onToggleType={toggleFilterType}
                            gameIds={filterGameIds}
                            onToggleGame={toggleFilterGame}
                            gameGroups={gameGroups}
                            dlcOptions={dlcApplicable ? dlcOptions : null}
                            dlcId={filterDlcId}
                            onChangeDlc={toggleFilterDlc}
                            collection={filterCollection}
                            collectionCounts={collectionCounts}
                            onChangeCollection={changeFilterCollection}
                            shiny={filterShiny}
                            onToggleShiny={() => setFilterShiny(value => !value)}
                            excludeForms={filterExcludeForms}
                            onToggleExcludeForms={() => setFilterExcludeForms(value => !value)}
                            resultCount={summaries.length}
                            canReset={hasActiveFilterPanel}
                            onReset={clearFilters}
                            onClose={closeFilterPanel}
                        />
                    )}
                </div>
            </section>

            {/* Mobile header band with branding */}
            <div className="mobile-header-band" aria-hidden="true">
                <span className="mobile-header-band__title">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h6.5" />
                        <path d="M15.5 12H22" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                    Pokédex CM
                </span>
            </div>

            {/* Auth corner — absolute on desktop, fixed circle on mobile */}
            <div className="pokedex-auth-corner">
                {user ? (
                    <UserMenu user={user} onLogout={handleLogout} />
                ) : (
                    <button
                        type="button"
                        className="collection-action-button collection-action-button--login"
                        onClick={() => setShowAuthModal(true)}
                        aria-label="Login"
                    >
                        <UserIcon size={16} className="login-btn__icon" />
                        <span className="login-btn__text">Login</span>
                    </button>
                )}
            </div>

            {/* Mobile actions toggle */}
            <div className="collection-actions-mobile-header">
                <button
                    type="button"
                    className="collection-actions-mobile-trigger"
                    onClick={() => setMobileActionsOpen(o => !o)}
                    aria-expanded={mobileActionsOpen}
                >
                    Actions {mobileActionsOpen ? '▲' : '▾'}
                </button>
            </div>

            <section className={`collection-actions${mobileActionsOpen ? ' collection-actions--mobile-open' : ''}`}>
                <button
                    type="button"
                    className="collection-action-button"
                    onClick={() => { setShowImportModal(true); setMobileActionsOpen(false); }}
                >
                    Import Collection
                </button>

                <button
                    type="button"
                    className="collection-action-button"
                    onClick={() => { setExportStep('type'); setMobileActionsOpen(false); }}
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

                {user && (
                    <>
                        <button
                            type="button"
                            className="collection-action-button collection-action-button--cloud"
                            onClick={() => { handleOpenSaveModal(); setMobileActionsOpen(false); }}
                        >
                            Save Collection
                        </button>

                        <button
                            type="button"
                            className="collection-action-button collection-action-button--cloud"
                            onClick={() => { handleOpenMyCollections(); setMobileActionsOpen(false); }}
                        >
                            My Collections
                        </button>
                    </>
                )}

                {collection.selectedPokemonIds.length > 0 && (
                    <button
                        type="button"
                        className="collection-action-button collection-action-button--danger collection-actions__clear-mobile"
                        onClick={() => { setShowClearConfirm(true); setMobileActionsOpen(false); }}
                    >
                        <X size={14} />
                        Clear all
                    </button>
                )}
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
                {summaries.map(item => (
                    <PokemonCard
                        key={item.id}
                        pokemon={item}
                        selected={collection.isPokemonSelected(item.id)}
                        collectionVisible={collectionVisible}
                        shiny={filterShiny}
                        onToggleSelected={handleGridToggleSelected}
                        onOpenDetails={handleGridOpenDetails}
                        onCommitDeselection={handleGridCommitDeselection}
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
                onToggleCollectionVisible={() => setCollectionVisible(v => !v)}
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

            {showAuthModal && (
                <AuthModal
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={handleAuthSuccess}
                />
            )}

            {showSaveModal && user && (
                <SaveCollectionModal
                    onClose={() => setShowSaveModal(false)}
                    onSaveNew={handleSaveNew}
                    onOverwrite={handleOverwrite}
                    existingCollections={cloudCollections}
                />
            )}

            {showMyCollections && user && (
                <MyCollectionsModal
                    onClose={() => setShowMyCollections(false)}
                    onLoad={handleLoadCloud}
                    onDelete={handleDeleteCloud}
                    collections={cloudCollections}
                    loading={cloudLoading}
                />
            )}

            {toast && (
                <div className={`pokedex-toast pokedex-toast--${toast.type}`} role="status">
                    {toast.message}
                </div>
            )}

            {showScrollTop && (
                <button
                    type="button"
                    className="scroll-to-top"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    aria-label="Back to top"
                >
                    <ChevronUp size={22} />
                </button>
            )}
        </main>
    );
}
