import { Check, ChevronRight, Search, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { APP_VERSION } from '../appInfo';
import { useIsMobile } from '../hooks/useIsMobile';
import type { PokemonType, PokemonTypeFilterId } from '../types/Pokemon';
import { TypeBadge } from './TypeBadge';

export type CollectionFilter = 'all' | 'owned' | 'missing';

export interface FilterGame {
    id: string;
    name: string;
    iconUrl: string | null;
}

export interface FilterGameGroup {
    generation: number;
    games: FilterGame[];
}

export interface FilterDlcOption {
    id: string;
    label: string;
}

const GENERATIONS: { gen: number; roman: string; region: string }[] = [
    { gen: 1, roman: 'I', region: 'Kanto' }, { gen: 2, roman: 'II', region: 'Johto' },
    { gen: 3, roman: 'III', region: 'Hoenn' }, { gen: 4, roman: 'IV', region: 'Sinnoh' },
    { gen: 5, roman: 'V', region: 'Unova' }, { gen: 6, roman: 'VI', region: 'Kalos' },
    { gen: 7, roman: 'VII', region: 'Alola' }, { gen: 8, roman: 'VIII', region: 'Galar' },
    { gen: 9, roman: 'IX', region: 'Paldea' },
];

const ELEMENTAL_TYPES: PokemonType[] = [
    'NORMAL', 'FIRE', 'WATER', 'GRASS', 'ELECTRIC', 'ICE', 'FIGHTING', 'POISON', 'GROUND',
    'FLYING', 'PSYCHIC', 'BUG', 'ROCK', 'GHOST', 'DRAGON', 'DARK', 'STEEL', 'FAIRY',
];

// Species-level pseudo-categories, filtered through the same Type filter.
const CATEGORY_TYPES: PokemonTypeFilterId[] = ['LEGENDARY', 'MYTHICAL', 'STARTER'];

const COLLECTION_OPTIONS: { id: CollectionFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'owned', label: 'Owned' },
    { id: 'missing', label: 'Missing' },
];

type SectionId = 'collection' | 'generation' | 'type' | 'game' | 'options';

const SECTIONS: { id: SectionId; label: string }[] = [
    { id: 'collection', label: 'Collection' },
    { id: 'generation', label: 'Generation' },
    { id: 'type', label: 'Type' },
    { id: 'game', label: 'Game' },
    { id: 'options', label: 'Options' },
];

const romanOf = (gen: number) => GENERATIONS.find(g => g.gen === gen)?.roman ?? String(gen);
const typeLabel = (type: PokemonTypeFilterId) => type.charAt(0) + type.slice(1).toLowerCase();

interface FilterPanelProps {
    generations: number[];
    onToggleGeneration: (gen: number) => void;
    types: PokemonTypeFilterId[];
    onToggleType: (type: PokemonTypeFilterId) => void;
    gameIds: string[];
    onToggleGame: (gameId: string) => void;
    gameGroups: FilterGameGroup[];
    /** Null unless exactly one game with known DLC is selected. */
    dlcOptions: FilterDlcOption[] | null;
    dlcId: string;
    onChangeDlc: (dlcId: string) => void;
    collection: CollectionFilter;
    collectionCounts: Record<CollectionFilter, number>;
    onChangeCollection: (value: CollectionFilter) => void;
    shiny: boolean;
    onToggleShiny: () => void;
    excludeForms: boolean;
    onToggleExcludeForms: () => void;
    resultCount: number;
    canReset: boolean;
    onReset: () => void;
    onClose: () => void;
}

/**
 * Listing filter panel. Desktop: tabs on the left, content on the right. Mobile: bottom sheet
 * with accordion sections that summarize the current choice. PokedexPage owns all filter state;
 * every change applies immediately — "Show N Pokémon" only closes the panel.
 */
export function FilterPanel(props: FilterPanelProps) {
    const isMobile = useIsMobile();
    const { onClose } = props;

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return isMobile ? <FilterSheet {...props} /> : <FilterTabsPanel {...props} />;
}

// ---------------------------------------------------------------------------
// Layouts
// ---------------------------------------------------------------------------

function FilterTabsPanel(props: FilterPanelProps) {
    const [section, setSection] = useState<SectionId>('collection');
    const counts = sectionCounts(props);

    return (
        <div className="filter-panel filter-panel--tabs" role="dialog" aria-label="Filters">
            <nav className="filter-panel__tabs" aria-label="Filter sections">
                {SECTIONS.map(item => (
                    <button
                        key={item.id}
                        type="button"
                        className={`filter-panel__tab${section === item.id ? ' filter-panel__tab--active' : ''}`}
                        aria-current={section === item.id ? 'true' : undefined}
                        onClick={() => setSection(item.id)}
                    >
                        {item.label}
                        {counts[item.id] > 0 && <span className="filter-panel__tab-count">{counts[item.id]}</span>}
                    </button>
                ))}
                <span className="app-version app-version--filter-tabs">v{APP_VERSION}</span>
            </nav>

            <div className="filter-panel__content">
                <SectionHeader title={SECTIONS.find(s => s.id === section)!.label} onClear={clearHandler(props, section)} />
                <SectionBody section={section} {...props} />
            </div>

            <PanelFooter {...props} />
        </div>
    );
}

function FilterSheet(props: FilterPanelProps) {
    const [openSection, setOpenSection] = useState<SectionId | null>('collection');

    return (
        <div className="filter-sheet" role="dialog" aria-modal="true" aria-label="Filters">
            <div className="filter-sheet__backdrop" onClick={props.onClose} />
            <div className="filter-sheet__panel">
                <div className="filter-sheet__grab" aria-hidden="true" />
                <header className="filter-sheet__header">
                    <strong>Filters</strong>
                    <button type="button" className="filter-sheet__close" onClick={props.onClose} aria-label="Close filters">
                        <X size={17} strokeWidth={2.6} />
                    </button>
                </header>

                <div className="filter-sheet__sections">
                    {SECTIONS.map(item => {
                        const open = openSection === item.id;
                        const summary = sectionSummary(props, item.id);
                        return (
                            <div key={item.id} className={`filter-sheet__section${open ? ' filter-sheet__section--open' : ''}`}>
                                <button
                                    type="button"
                                    className="filter-sheet__section-header"
                                    aria-expanded={open}
                                    onClick={() => setOpenSection(open ? null : item.id)}
                                >
                                    <strong>{item.label}</strong>
                                    <span className={`filter-sheet__summary${summary.active ? ' filter-sheet__summary--active' : ''}`}>
                                        {summary.text}
                                    </span>
                                    <ChevronRight size={17} className="filter-sheet__chevron" />
                                </button>
                                {open && (
                                    <div className="filter-sheet__section-body">
                                        <SectionBody section={item.id} {...props} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <PanelFooter {...props} />
            </div>
        </div>
    );
}

function PanelFooter({ resultCount, canReset, onReset, onClose }: FilterPanelProps) {
    return (
        <footer className="filter-panel__footer">
            <button type="button" className="filter-panel__reset" onClick={onReset} disabled={!canReset}>
                Reset
            </button>
            <button type="button" className="filter-panel__show" onClick={onClose}>
                Show {resultCount} Pokémon
            </button>
        </footer>
    );
}

function SectionHeader({ title, onClear }: { title: string; onClear: (() => void) | null }) {
    return (
        <div className="filter-panel__section-title">
            {title}
            {onClear && (
                <button type="button" onClick={onClear}>Clear</button>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sections (shared by both layouts)
// ---------------------------------------------------------------------------

function SectionBody({ section, ...props }: FilterPanelProps & { section: SectionId }) {
    switch (section) {
        case 'collection': return <CollectionSection {...props} />;
        case 'generation': return <GenerationSection {...props} />;
        case 'type': return <TypeSection {...props} />;
        case 'game': return <GameSection {...props} />;
        case 'options': return <OptionsSection {...props} />;
    }
}

function CollectionSection({ collection, collectionCounts, onChangeCollection }: FilterPanelProps) {
    return (
        <div className="filter-panel__segmented" role="radiogroup" aria-label="Collection">
            {COLLECTION_OPTIONS.map(option => (
                <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={collection === option.id}
                    className={`filter-panel__segment${collection === option.id ? ' filter-panel__segment--active' : ''}`}
                    onClick={() => onChangeCollection(option.id)}
                >
                    {option.label}
                    <em>{collectionCounts[option.id]}</em>
                </button>
            ))}
        </div>
    );
}

function GenerationSection({ generations, onToggleGeneration }: FilterPanelProps) {
    return (
        <div className="filter-panel__generations">
            {GENERATIONS.map(({ gen, roman, region }) => {
                const active = generations.includes(gen);
                return (
                    <button
                        key={gen}
                        type="button"
                        aria-pressed={active}
                        className={`filter-panel__generation${active ? ' filter-panel__generation--active' : ''}`}
                        onClick={() => onToggleGeneration(gen)}
                    >
                        <strong>Gen {roman}</strong>
                        <small>{region}</small>
                    </button>
                );
            })}
        </div>
    );
}

function TypeSection({ types, onToggleType }: FilterPanelProps) {
    return (
        <>
            <div className="filter-panel__types">
                {ELEMENTAL_TYPES.map(type => {
                    const active = types.includes(type);
                    return (
                        <button
                            key={type}
                            type="button"
                            aria-pressed={active}
                            className={`filter-panel__type${active ? ' filter-panel__type--active' : ''}`}
                            onClick={() => onToggleType(type)}
                        >
                            <TypeBadge type={type} />
                            {typeLabel(type)}
                        </button>
                    );
                })}
            </div>
            <div className="filter-panel__chips">
                {CATEGORY_TYPES.map(type => {
                    const active = types.includes(type);
                    return (
                        <button
                            key={type}
                            type="button"
                            aria-pressed={active}
                            className={`filter-panel__chip${active ? ' filter-panel__chip--active' : ''}`}
                            onClick={() => onToggleType(type)}
                        >
                            <Star size={13} fill="currentColor" strokeWidth={0} />
                            {typeLabel(type)}
                        </button>
                    );
                })}
            </div>
        </>
    );
}

function GameSection({ gameIds, onToggleGame, gameGroups, dlcOptions, dlcId, onChangeDlc }: FilterPanelProps) {
    const [query, setQuery] = useState('');
    const term = query.trim().toLowerCase();
    const visibleGroups = gameGroups
        .map(group => ({ ...group, games: group.games.filter(game => !term || game.name.toLowerCase().includes(term)) }))
        .filter(group => group.games.length > 0);

    return (
        <>
            <label className="filter-panel__game-search">
                <Search size={15} strokeWidth={2.4} />
                <input
                    type="search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search games"
                    aria-label="Search games"
                    autoComplete="off"
                />
            </label>

            <div className="filter-panel__games">
                {visibleGroups.map(group => (
                    <div key={group.generation} className="filter-panel__game-group">
                        <div className="filter-panel__game-group-title">
                            Gen {romanOf(group.generation)} · {GENERATIONS.find(g => g.gen === group.generation)?.region}
                        </div>
                        {group.games.map(game => {
                            const active = gameIds.includes(game.id);
                            return (
                                <button
                                    key={game.id}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={active}
                                    className={`filter-panel__game${active ? ' filter-panel__game--active' : ''}`}
                                    onClick={() => onToggleGame(game.id)}
                                >
                                    {game.iconUrl
                                        ? <img src={game.iconUrl} alt="" loading="lazy" />
                                        : <span className="filter-panel__game-placeholder">{game.name.charAt(0)}</span>}
                                    <span className="filter-panel__game-name">{game.name}</span>
                                    <span className="filter-panel__checkbox">{active && <Check size={12} strokeWidth={3.4} />}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
                {visibleGroups.length === 0 && <p className="filter-panel__empty">No games match “{query}”.</p>}
            </div>

            {dlcOptions && (
                <div className="filter-panel__dlc">
                    <div className="filter-panel__section-title">DLC</div>
                    <div className="filter-panel__chips">
                        {dlcOptions.map(option => (
                            <button
                                key={option.id}
                                type="button"
                                aria-pressed={dlcId === option.id}
                                className={`filter-panel__chip${dlcId === option.id ? ' filter-panel__chip--active' : ''}`}
                                onClick={() => onChangeDlc(option.id)}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

function OptionsSection({ shiny, onToggleShiny, excludeForms, onToggleExcludeForms }: FilterPanelProps) {
    return (
        <div className="filter-panel__options">
            <SwitchRow label="Shiny" hint="Show shiny sprites in the grid" checked={shiny} onToggle={onToggleShiny} />
            <SwitchRow label="Exclude forms" hint="Hide Mega, Gigantamax and regional forms" checked={excludeForms} onToggle={onToggleExcludeForms} />
        </div>
    );
}

function SwitchRow({ label, hint, checked, onToggle }: { label: string; hint: ReactNode; checked: boolean; onToggle: () => void }) {
    return (
        <button type="button" role="switch" aria-checked={checked} className="filter-panel__switch-row" onClick={onToggle}>
            <span>
                {label}
                <small>{hint}</small>
            </span>
            <span className={`filter-switch${checked ? ' filter-switch--on' : ''}`}>
                <span className="filter-switch__knob" />
            </span>
        </button>
    );
}

// ---------------------------------------------------------------------------
// Summaries, counts and per-section "Clear"
// ---------------------------------------------------------------------------

function sectionCounts(props: FilterPanelProps): Record<SectionId, number> {
    return {
        collection: props.collection !== 'all' ? 1 : 0,
        generation: props.generations.length,
        type: props.types.length,
        game: props.gameIds.length,
        options: (props.shiny ? 1 : 0) + (props.excludeForms ? 1 : 0),
    };
}

function sectionSummary(props: FilterPanelProps, section: SectionId): { text: string; active: boolean } {
    switch (section) {
        case 'collection': {
            const option = COLLECTION_OPTIONS.find(o => o.id === props.collection)!;
            return { text: option.label, active: props.collection !== 'all' };
        }
        case 'generation':
            return props.generations.length === 0
                ? { text: 'All', active: false }
                : { text: [...props.generations].sort((a, b) => a - b).map(gen => `Gen ${romanOf(gen)}`).join(', '), active: true };
        case 'type':
            return props.types.length === 0
                ? { text: 'All', active: false }
                : { text: props.types.map(typeLabel).join(', '), active: true };
        case 'game': {
            if (props.gameIds.length === 0) return { text: 'All', active: false };
            if (props.gameIds.length > 1) return { text: `${props.gameIds.length} games`, active: true };
            const game = props.gameGroups.flatMap(group => group.games).find(g => g.id === props.gameIds[0]);
            return { text: game?.name ?? '1 game', active: true };
        }
        case 'options': {
            const on = [props.shiny && 'Shiny', props.excludeForms && 'No forms'].filter(Boolean);
            return { text: on.length ? on.join(', ') : 'Off', active: on.length > 0 };
        }
    }
}

function clearHandler(props: FilterPanelProps, section: SectionId): (() => void) | null {
    if (section === 'generation' && props.generations.length > 0) {
        return () => props.generations.forEach(props.onToggleGeneration);
    }
    if (section === 'type' && props.types.length > 0) {
        return () => props.types.forEach(props.onToggleType);
    }
    if (section === 'game' && props.gameIds.length > 0) {
        return () => props.gameIds.forEach(props.onToggleGame);
    }
    return null;
}
