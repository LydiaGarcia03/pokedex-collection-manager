import { ChevronDown, ChevronUp, Filter, User as UserIcon, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchTcgCards, filterPokemon, loadAllPokemon } from '../api/pokemonApi';
import { AuthModal } from '../components/AuthModal';
import { ExportContentModal } from '../components/ExportContentModal';
import { ExportTypeModal } from '../components/ExportTypeModal';
import { FilterCombobox, type FilterComboboxGroup } from '../components/FilterCombobox';
import { ImportCollectionModal } from '../components/ImportCollectionModal';
import { MyCollectionsModal } from '../components/MyCollectionsModal';
import { PokemonCard } from '../components/PokemonCard';
import { PokemonModal } from '../components/PokemonModal';
import { SaveCollectionModal } from '../components/SaveCollectionModal';
import { TypeBadge } from '../components/TypeBadge';
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
import type { Pokemon, PokemonSummary, PokemonType, PokemonTypeFilterId, TcgCard } from '../types/Pokemon';
import { buildExportText, type ExportType } from '../utils/collectionFormat';

type ExportStep = 'closed' | 'type' | 'loading' | 'content';

interface Toast {
    message: string;
    type: 'success' | 'error';
}

// Sentinel ids for the DLC combobox's two non-specific options.
// "-" (DLC_NONE_ID) is the default: base-game Pokémon only, no DLC content.
// "All DLCs" (DLC_ALL_ID) removes the DLC restriction entirely: base game + every DLC.
const DLC_NONE_ID = 'none';
const DLC_ALL_ID = 'all';

const GEN_REGION_LABELS: Record<number, string> = {
    1: 'Gen I · Kanto', 2: 'Gen II · Johto', 3: 'Gen III · Hoenn',
    4: 'Gen IV · Sinnoh', 5: 'Gen V · Unova', 6: 'Gen VI · Kalos',
    7: 'Gen VII · Alola', 8: 'Gen VIII · Galar', 9: 'Gen IX · Paldea',
};

const ALL_TYPES: PokemonType[] = [
    'NORMAL', 'FIRE', 'WATER', 'GRASS', 'ELECTRIC', 'ICE', 'FIGHTING', 'POISON', 'GROUND',
    'FLYING', 'PSYCHIC', 'BUG', 'ROCK', 'GHOST', 'DRAGON', 'DARK', 'STEEL', 'FAIRY',
];

// Species-level pseudo-categories shown in the "Category" group of the same Type filter.
const CATEGORY_TYPES: PokemonTypeFilterId[] = ['LEGENDARY', 'MYTHICAL', 'STARTER'];

function typeLabel(type: PokemonTypeFilterId): string {
    return type.charAt(0) + type.slice(1).toLowerCase();
}

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
    const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const [openCombobox, setOpenCombobox] = useState<'generation' | 'type' | 'game' | 'dlc' | null>(null);
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
                setOpenCombobox(null);
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    // Unique games available across all Pokémon, grouped by generation for the filter panel
    const gamesByGeneration = useMemo(() => {
        const seen = new Map<string, { id: string; name: string; generation: number }>();
        for (const p of allPokemon) {
            for (const g of p.games ?? []) {
                if (!seen.has(g.id) && g.generation != null) {
                    seen.set(g.id, { id: g.id, name: g.name, generation: g.generation });
                }
            }
        }
        const groups = new Map<number, { id: string; name: string }[]>();
        for (const g of seen.values()) {
            const list = groups.get(g.generation) ?? [];
            list.push({ id: g.id, name: g.name });
            groups.set(g.generation, list);
        }
        return [...groups.entries()].sort(([a], [b]) => a - b);
    }, [allPokemon]);

    const generationOptions = useMemo(
        () => Object.entries(GEN_REGION_LABELS).map(([gen, label]) => ({ id: gen, label })),
        []
    );

    const typeOptions = useMemo(
        () => ALL_TYPES.map(type => ({ id: type, label: typeLabel(type), icon: <TypeBadge type={type} /> })),
        []
    );

    const categoryOptions = useMemo(
        () => CATEGORY_TYPES.map(type => ({ id: type, label: typeLabel(type), icon: <TypeBadge type={type} /> })),
        []
    );

    const typeFilterGroups: FilterComboboxGroup[] = useMemo(
        () => [
            { heading: 'Type', options: typeOptions },
            { heading: 'Category', options: categoryOptions },
        ],
        [typeOptions, categoryOptions]
    );

    const gameGroups = useMemo(
        () => gamesByGeneration.map(([gen, games]) => ({
            heading: GEN_REGION_LABELS[gen] ?? `Gen ${gen}`,
            options: games.map(g => ({ id: g.id, label: g.name })),
        })),
        [gamesByGeneration]
    );

    // DLC options for the currently selected game — only meaningful when exactly one game is
    // selected and that game has known DLCs (Sword/Shield, Scarlet/Violet). The combobox itself
    // always renders (see JSX) so the filter panel never resizes; it's just visually hidden
    // (space still reserved) when this list is empty.
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
            { id: DLC_NONE_ID, label: '─' },
            { id: DLC_ALL_ID, label: 'All DLCs' },
            ...dlcOptionsForSelectedGame.map(d => ({ id: d.id, label: d.name })),
        ],
        [dlcOptionsForSelectedGame]
    );

    // Reset back to "-" (base game only, the default) and close the combobox whenever the
    // current game selection no longer has any DLC to filter by.
    useEffect(() => {
        if (!dlcApplicable) {
            if (filterDlcId !== DLC_NONE_ID) setFilterDlcId(DLC_NONE_ID);
            setOpenCombobox(prev => prev === 'dlc' ? null : prev);
        }
    }, [dlcApplicable, filterDlcId]);

    const activeFilterCount =
        (filterGenerations.length > 0 ? 1 : 0) + (filterTypes.length > 0 ? 1 : 0) + (filterGameIds.length > 0 ? 1 : 0)
        + (dlcApplicable && filterDlcId !== DLC_NONE_ID ? 1 : 0) + (filterExcludeForms ? 1 : 0);
    const hasActiveFilterPanel = activeFilterCount > 0 || filterShiny;

    function toggleFilterGeneration(id: string) {
        const gen = Number(id);
        setFilterGenerations(prev => prev.includes(gen) ? prev.filter(g => g !== gen) : [...prev, gen]);
    }

    function toggleFilterType(id: string) {
        const type = id as PokemonTypeFilterId;
        setFilterTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    }

    function toggleFilterGame(gameId: string) {
        setFilterGameIds(prev => prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]);
    }

    function toggleFilterDlc(dlcId: string) {
        setFilterDlcId(dlcId);
    }

    function clearFilters() {
        setFilterGenerations([]);
        setFilterTypes([]);
        setFilterGameIds([]);
        setFilterDlcId(DLC_NONE_ID);
        setFilterExcludeForms(false);
        setFilterShiny(false);
    }

    // Client-side filtering — same logic as PokemonSearchFilter.java
    const summaries: PokemonSummary[] = useMemo(
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
                        <div className="pokedex-filter__dropdown" role="dialog" aria-label="Filters">
                            <div className="pokedex-filter__grid">
                                <FilterCombobox
                                    label="Generation / Region"
                                    options={generationOptions}
                                    selectedIds={filterGenerations.map(String)}
                                    onToggle={toggleFilterGeneration}
                                    open={openCombobox === 'generation'}
                                    onOpenChange={o => setOpenCombobox(o ? 'generation' : null)}
                                />
                                <FilterCombobox
                                    label="Type / Category"
                                    groups={typeFilterGroups}
                                    selectedIds={filterTypes}
                                    onToggle={toggleFilterType}
                                    open={openCombobox === 'type'}
                                    onOpenChange={o => setOpenCombobox(o ? 'type' : null)}
                                />
                                <div className="pokedex-filter__game-row">
                                    <div className="pokedex-filter__game-slot">
                                        <FilterCombobox
                                            label="Game"
                                            groups={gameGroups}
                                            selectedIds={filterGameIds}
                                            onToggle={toggleFilterGame}
                                            open={openCombobox === 'game'}
                                            onOpenChange={o => setOpenCombobox(o ? 'game' : null)}
                                        />
                                    </div>
                                    {/* Always rendered (space always reserved) so the panel never resizes —
                                        just visually hidden until a single DLC-capable game is selected. */}
                                    <div className={`pokedex-filter__dlc-slot${dlcApplicable ? '' : ' pokedex-filter__dlc-slot--hidden'}`}>
                                        <FilterCombobox
                                            label="DLC"
                                            options={dlcOptions}
                                            selectedIds={[filterDlcId]}
                                            onToggle={toggleFilterDlc}
                                            open={openCombobox === 'dlc'}
                                            onOpenChange={o => setOpenCombobox(o ? 'dlc' : null)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pokedex-filter__options">
                                <div className="filter-combobox__label">Options</div>
                                <div className="pokedex-filter__options-grid">
                                    <div className="filter-switch-row">
                                        <span className="filter-switch-row__label">Shiny</span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={filterShiny}
                                            className={`filter-switch${filterShiny ? ' filter-switch--on' : ''}`}
                                            onClick={() => setFilterShiny(s => !s)}
                                        >
                                            <span className="filter-switch__knob" />
                                        </button>
                                    </div>
                                    <div className="filter-switch-row">
                                        <span className="filter-switch-row__label">Exclude forms</span>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={filterExcludeForms}
                                            className={`filter-switch${filterExcludeForms ? ' filter-switch--on' : ''}`}
                                            onClick={() => setFilterExcludeForms(f => !f)}
                                        >
                                            <span className="filter-switch__knob" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {hasActiveFilterPanel && (
                                <button type="button" className="pokedex-filter__reset" onClick={clearFilters}>
                                    Reset
                                </button>
                            )}
                        </div>
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
                {summaries.map((item, index) => (
                    <PokemonCard
                        key={item.id}
                        pokemon={item}
                        selected={collection.isPokemonSelected(item.id)}
                        collectionVisible={collectionVisible}
                        shiny={filterShiny}
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
