import { Check, ChevronLeft, ChevronRight, MinusCircle, Search, WifiOff, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, TouchEvent } from 'react';
import { cardsForForm, fetchTcgCards, getLoadedTcgCards, getLoadedTcgSetNames, loadTcgSetNames } from '../api/pokemonApi';
import { useIsMobile } from '../hooks/useIsMobile';
import type { CardOwnership, Pokemon, TcgCard, TcgCardsApiResponse } from '../types/Pokemon';
import { FoilSparklesIcon } from './FoilSparklesIcon';

const IMAGE_TIMEOUT_MS = 8000;
const SWIPE_MIN_PX = 50;

// Desktop corner box: each click moves the card to the next state.
const NEXT_OWNERSHIP: Record<CardOwnership, CardOwnership> = { none: 'owned', owned: 'foil', foil: 'none' };

type StatusFilter = 'all' | 'owned' | 'missing' | 'foil';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'owned', label: 'Owned' },
    { id: 'missing', label: 'Missing' },
    { id: 'foil', label: 'Foil' },
];

const OWNERSHIP_OPTIONS: { id: CardOwnership; label: string; icon: ReactNode }[] = [
    { id: 'none', label: 'No', icon: <MinusCircle size={17} strokeWidth={2.4} /> },
    { id: 'owned', label: 'Yes', icon: <Check size={17} strokeWidth={3} /> },
    { id: 'foil', label: 'Yes, foil', icon: <FoilSparklesIcon size={17} /> },
];

function foldText(text: string) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// "SV058" -> "sv58", "007" -> "7", so "58" or "sv58" find card SV058.
function normalizeCardNumber(value: string) {
    return value.toLowerCase().replace(/^([a-z]*)0+(?=\d)/, '$1');
}

// Every whitespace-separated term must match the card's name, set name, or number.
function matchesQuery(card: TcgCard, setName: string, query: string) {
    const terms = foldText(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return true;
    const haystack = foldText(`${card.name} ${setName} ${card.setId ?? ''}`);
    const number = card.number ? normalizeCardNumber(decodeURIComponent(card.number)) : null;
    return terms.every(term =>
        haystack.includes(term) || (number !== null && normalizeCardNumber(term).replace(/^#/, '') === number)
    );
}

function CardImage({ card, lazy = false }: { card: TcgCard; lazy?: boolean }) {
    const [imgFailed, setImgFailed] = useState(false);
    const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // A lazy image only starts downloading when scrolled near, so the hang timeout must start then
    // too — counting from mount gave up on every card further down a long list.
    useEffect(() => {
        const img = imgRef.current;
        if (!card.imageUrl || !img) return;
        const startTimer = () => {
            if (timerRef.current === null && !img.complete) {
                timerRef.current = window.setTimeout(() => setImgFailed(true), IMAGE_TIMEOUT_MS);
            }
        };
        let observer: IntersectionObserver | null = null;
        if (lazy) {
            observer = new IntersectionObserver(entries => {
                if (entries.some(entry => entry.isIntersecting)) {
                    startTimer();
                    observer?.disconnect();
                }
            });
            observer.observe(img);
        } else {
            startTimer();
        }
        return () => {
            observer?.disconnect();
            if (timerRef.current !== null) window.clearTimeout(timerRef.current);
            timerRef.current = null;
        };
    }, [card.imageUrl, lazy]);

    if (!card.imageUrl || imgFailed) {
        return (
            <div className="pokemon-tcg-card__placeholder">
                <strong>{card.name}</strong>
                {card.setId && <span>{card.setId}</span>}
                {card.number && <small>#{card.number}</small>}
            </div>
        );
    }

    function handleLoad() {
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    }

    return (
        <img
            ref={imgRef}
            src={card.imageUrl}
            alt={card.name}
            loading={lazy ? 'lazy' : undefined}
            decoding="async"
            onLoad={handleLoad}
            onError={() => setImgFailed(true)}
        />
    );
}

interface PokemonTcgTabProps {
    pokemon: Pokemon;
    selected: boolean;
    collectionVisible: boolean;
    selectedCardIds: string[];
    onToggleCard: (cardId: string) => void;
    foilCardIds: string[];
    onSetCardOwnership: (cardId: string, ownership: CardOwnership) => void;
    /** The listing's "Exclude forms" filter: the species entry then shows its forms' cards too. */
    excludeForms: boolean;
}

// Rendered with key={pokemon.id} by PokemonModal, so search, filters and the open card all reset
// whenever the displayed Pokémon (species or form) changes.
export function PokemonTcgTab({
    pokemon,
    selected,
    collectionVisible,
    selectedCardIds,
    onToggleCard,
    foilCardIds,
    onSetCardOwnership,
    excludeForms,
}: PokemonTcgTabProps) {
    const isMobile = useIsMobile();
    // Already-loaded data renders immediately; the effect below only fetches what is missing.
    const [tcgData, setTcgData] = useState<TcgCardsApiResponse | null>(() => {
        const cards = getLoadedTcgCards(pokemon.name);
        return cards ? { cards, dataUnavailable: false } : null;
    });
    const [setNames, setSetNames] = useState<Record<string, string>>(() => getLoadedTcgSetNames() ?? {});
    const [loading, setLoading] = useState(() => getLoadedTcgCards(pokemon.name) === null || getLoadedTcgSetNames() === null);
    const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
    // Card viewer: the cards it pages through, frozen when it opens — otherwise marking a card
    // "No" while filtering by Owned would drop it from the list and close the viewer mid-review.
    const [viewerCardIds, setViewerCardIds] = useState<string[]>([]);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    // Desktop multi-select (option T4 of docs/tcg-tab-mock.html, started with Shift+click): pick
    // several cards, then mark them all at once from the bar at the bottom.
    const [picking, setPicking] = useState(false);
    const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set());

    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const viewerRef = useRef<HTMLDivElement>(null);

    // Focus the viewer when it opens, so Esc and ← → reach it (and not the Pokémon navigation).
    const viewerOpen = focusedCardId !== null;
    useEffect(() => {
        if (viewerOpen) viewerRef.current?.focus();
    }, [viewerOpen]);

    function stopPicking() {
        setPicking(false);
        setPickedIds(new Set());
    }

    function togglePicked(cardId: string) {
        setPickedIds(current => {
            const next = new Set(current);
            if (next.has(cardId)) next.delete(cardId);
            else next.add(cardId);
            return next;
        });
    }

    function applyToPicked(ownership: CardOwnership) {
        for (const cardId of pickedIds) onSetCardOwnership(cardId, ownership);
        stopPicking();
    }

    useEffect(() => {
        if (!loading) return;
        let cancelled = false;

        // Cards are keyed by pokemon.name (not id) in tcg-cards.json
        Promise.all([fetchTcgCards(pokemon.name), loadTcgSetNames()])
            .then(([data, names]) => {
                if (cancelled) return;
                setTcgData(data);
                setSetNames(names);
            })
            .catch(() => {
                if (!cancelled) setTcgData({ cards: [], dataUnavailable: true });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [pokemon.name, loading]);

    if (loading) {
        return (
            <div className="pokemon-tcg-tab">
                <div className="pokemon-detail-loading">
                    <span className="pokemon-detail-loading__spinner" />
                </div>
            </div>
        );
    }

    if (tcgData?.dataUnavailable) {
        return (
            <div className="pokemon-tcg-tab">
                <div className="tcg-unavailable-banner">
                    <WifiOff size={32} strokeWidth={1.6} />
                    <strong>Card data unavailable</strong>
                    <p>The TCG card data could not be loaded.<br />Check your connection and try again.</p>
                </div>
            </div>
        );
    }

    // Cards without a resolved image (placeholder-only) sort after everything else, so the
    // grid leads with real card art. Array.prototype.sort is stable, so order is otherwise
    // preserved within each group.
    const displayCards = [...cardsForForm(tcgData?.cards ?? [], pokemon, excludeForms)]
        .sort((a, b) => Number(!a.imageUrl) - Number(!b.imageUrl));

    if (displayCards.length === 0) {
        return (
            <div className="pokemon-tcg-tab">
                <p className="pokemon-tab-empty">
                    No TCG cards found for {pokemon.formName ? `${pokemon.name} (${pokemon.formName})` : pokemon.name} yet.
                </p>
            </div>
        );
    }

    const setNameOf = (card: TcgCard) => (card.setId ? setNames[card.setId] ?? card.setId : '');
    const ownershipOf = (cardId: string): CardOwnership =>
        !selectedCardIds.includes(cardId) ? 'none' : foilCardIds.includes(cardId) ? 'foil' : 'owned';

    // Owned/Missing/Foil only mean something while the Pokémon is selected (that's when cards can be marked).
    const activeStatus: StatusFilter = selected ? statusFilter : 'all';
    const statusCounts: Record<StatusFilter, number> = {
        all: displayCards.length,
        owned: displayCards.filter(c => ownershipOf(c.id) !== 'none').length,
        missing: displayCards.filter(c => ownershipOf(c.id) === 'none').length,
        foil: displayCards.filter(c => ownershipOf(c.id) === 'foil').length,
    };
    const visibleCards = displayCards.filter(card => {
        const ownership = ownershipOf(card.id);
        const statusOk =
            activeStatus === 'all' ||
            (activeStatus === 'owned' && ownership !== 'none') ||
            (activeStatus === 'missing' && ownership === 'none') ||
            (activeStatus === 'foil' && ownership === 'foil');
        return statusOk && matchesQuery(card, setNameOf(card), query);
    });

    const isPicking = picking && selected && !isMobile;
    const viewerCards = viewerCardIds
        .map(id => displayCards.find(c => c.id === id))
        .filter((c): c is TcgCard => c !== undefined);
    const focusedIndex = focusedCardId ? viewerCards.findIndex(c => c.id === focusedCardId) : -1;
    const focusedCard = focusedIndex >= 0 ? viewerCards[focusedIndex] : null;

    function openViewer(cardId: string) {
        setViewerCardIds(visibleCards.map(c => c.id));
        setFocusedCardId(cardId);
    }

    // A click on the card opens it big (phone and desktop). On desktop, Shift+click starts picking
    // several cards; while picking, a plain click picks too.
    function handleCardClick(card: TcgCard, shiftKey = false) {
        if (!isMobile && selected && (shiftKey || isPicking)) {
            setPicking(true);
            togglePicked(card.id);
        } else {
            openViewer(card.id);
        }
    }

    function stepFocus(delta: number) {
        if (focusedIndex < 0 || viewerCards.length === 0) return;
        const next = (focusedIndex + delta + viewerCards.length) % viewerCards.length;
        setFocusedCardId(viewerCards[next].id);
    }

    function handleFocusTouchEnd(event: TouchEvent) {
        const start = swipeStartRef.current;
        swipeStartRef.current = null;
        if (!start) return;
        const touch = event.changedTouches[0];
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
            stepFocus(dx < 0 ? 1 : -1);
        }
    }

    const toolbar = (
        <div className="pokemon-tcg-toolbar">
            <label className={`pokemon-tcg-search ${query ? 'pokemon-tcg-search--has-value' : ''}`}>
                <Search size={17} strokeWidth={2.4} className="pokemon-tcg-search__icon" />
                <input
                    type="search"
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder="Search card, set or number"
                    aria-label="Search cards"
                    autoComplete="off"
                />
                {query && (
                    <button type="button" className="pokemon-tcg-search__clear" onClick={() => setQuery('')} aria-label="Clear search">
                        <X size={14} strokeWidth={3} />
                    </button>
                )}
            </label>

            <div className="pokemon-tcg-toolbar__row">
                {selected && (
                    <div className="pokemon-tcg-filters" role="group" aria-label="Filter cards" data-no-pokemon-swipe>
                        {STATUS_FILTERS.map(filter => (
                            <button
                                key={filter.id}
                                type="button"
                                className={`pokemon-tcg-filter ${activeStatus === filter.id ? 'pokemon-tcg-filter--active' : ''}`}
                                aria-pressed={activeStatus === filter.id}
                                onClick={() => setStatusFilter(filter.id)}
                            >
                                {filter.id === 'foil' && <FoilSparklesIcon size={13} />}
                                {filter.label}
                                <em>{statusCounts[filter.id]}</em>
                            </button>
                        ))}
                    </div>
                )}
                <span className="pokemon-tcg-count">
                    {visibleCards.length} of {displayCards.length} cards
                </span>
            </div>
            {selected && !isMobile && !isPicking && (
                <p className="pokemon-tcg-tip">Tip: <kbd>Shift</kbd> + Click cards to mark several at once</p>
            )}
        </div>
    );

    return (
        <div className="pokemon-tcg-tab">
            {toolbar}

            {visibleCards.length === 0 ? (
                <div className="pokemon-tcg-empty">
                    <strong>No cards found</strong>
                    Try another search or clear the filters.
                </div>
            ) : (
                <div className="pokemon-tcg-grid">
                    {visibleCards.map(card => {
                        const ownership = ownershipOf(card.id);
                        const checked = ownership !== 'none';
                        const isFoil = ownership === 'foil';
                        // A card you don't have turns gray only in "collection visible" mode, like the
                        // Pokémon cards and the games. Desktop grays only the art, so the corner box
                        // stays readable and clickable.
                        const dimmed = isMobile && collectionVisible && !checked;
                        const missing = !isMobile && collectionVisible && !checked;

                        return (
                            <div
                                key={card.id}
                                className={[
                                    'pokemon-tcg-card',
                                    selected || isMobile || card.imageUrl ? 'pokemon-tcg-card--selectable' : '',
                                    checked ? 'pokemon-tcg-card--checked' : '',
                                    isFoil ? 'pokemon-tcg-card--foil' : '',
                                    dimmed ? 'pokemon-tcg-card--dimmed' : '',
                                    missing ? 'pokemon-tcg-card--missing' : '',
                                    isPicking && pickedIds.has(card.id) ? 'pokemon-tcg-card--picked' : '',
                                ].join(' ')}
                                role="button"
                                tabIndex={0}
                                aria-pressed={isPicking ? pickedIds.has(card.id) : undefined}
                                onClick={event => handleCardClick(card, event.shiftKey)}
                                // Shift+click would otherwise select the page text between clicks.
                                onMouseDown={event => event.shiftKey && event.preventDefault()}
                                onKeyDown={e => {
                                    if (e.target !== e.currentTarget) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handleCardClick(card, e.shiftKey);
                                    }
                                }}
                                title={`${card.name}${card.setId ? ` · ${setNameOf(card)}` : ''}${card.number ? ` #${card.number}` : ''}`}
                            >
                                {selected && isMobile && (
                                    <span
                                        className={`selectable-item-checkbox selectable-item-checkbox--compact selectable-item-checkbox--blurred ${
                                            checked ? 'selectable-item-checkbox--selected' : ''
                                        } ${isFoil ? 'selectable-item-checkbox--foil' : ''}`}
                                    >
                                        {isFoil ? <FoilSparklesIcon size={16} /> : checked && <Check size={20} strokeWidth={3.2} />}
                                    </span>
                                )}

                                {/* Mobile: tapping the card opens it, so the corner check gets its own 44px tap target. */}
                                {selected && isMobile && (
                                    <button
                                        type="button"
                                        className="pokemon-tcg-card__check-hit"
                                        aria-label={checked ? `Remove ${card.name} from collection` : `Add ${card.name} to collection`}
                                        onClick={event => {
                                            event.stopPropagation();
                                            onToggleCard(card.id);
                                        }}
                                    />
                                )}

                                {/* Desktop: the corner box cycles empty → have → foil → empty. */}
                                {selected && !isMobile && (
                                    <button
                                        type="button"
                                        className={[
                                            'selectable-item-checkbox selectable-item-checkbox--compact selectable-item-checkbox--blurred',
                                            'pokemon-tcg-card__state',
                                            checked ? 'selectable-item-checkbox--selected' : '',
                                            isFoil ? 'selectable-item-checkbox--foil' : '',
                                        ].join(' ')}
                                        onClick={event => {
                                            event.stopPropagation();
                                            onSetCardOwnership(card.id, NEXT_OWNERSHIP[ownership]);
                                        }}
                                        aria-label={`${card.name}: ${isFoil ? 'have, foil' : checked ? 'have' : "don't have"}. Click to change.`}
                                        title={isFoil ? 'Have, foil — click to remove' : checked ? 'Have — click again to mark as foil' : 'Click to mark as have'}
                                    >
                                        {isFoil ? <FoilSparklesIcon size={18} /> : checked && <Check size={20} strokeWidth={3.2} />}
                                    </button>
                                )}

                                {isPicking && <span className="pokemon-tcg-card__pick" aria-hidden="true" />}

                                <CardImage card={card} lazy />

                                {card.lang === 'ja' && <span className="pokemon-tcg-lang-tag" title="Japan-exclusive card">JP</span>}
                                {isFoil && <span className="pokemon-tcg-foil-tag">Foil</span>}
                            </div>
                        );
                    })}
                </div>
            )}

            {isPicking && (
                <div className="pokemon-tcg-batch" role="toolbar" aria-label="Mark selected cards">
                    <strong>{pickedIds.size} selected</strong>
                    <button type="button" className="pokemon-tcg-batch__action pokemon-tcg-batch__action--owned" disabled={pickedIds.size === 0} onClick={() => applyToPicked('owned')}>
                        <Check size={15} strokeWidth={3} />
                        Have
                    </button>
                    <button type="button" className="pokemon-tcg-batch__action pokemon-tcg-batch__action--foil" disabled={pickedIds.size === 0} onClick={() => applyToPicked('foil')}>
                        <FoilSparklesIcon size={15} />
                        Foil
                    </button>
                    <button type="button" className="pokemon-tcg-batch__action" disabled={pickedIds.size === 0} onClick={() => applyToPicked('none')}>
                        <X size={15} strokeWidth={2.8} />
                        Remove
                    </button>
                    <button type="button" className="pokemon-tcg-batch__action pokemon-tcg-batch__action--ghost" onClick={stopPicking}>
                        Cancel
                    </button>
                </div>
            )}

            {focusedCard && (
                <>
                    {!isMobile && <div className="pokemon-tcg-viewer-backdrop" onClick={() => setFocusedCardId(null)} />}
                    <div
                        ref={viewerRef}
                        className={`pokemon-tcg-viewer ${isMobile ? '' : 'pokemon-tcg-viewer--desktop'}`}
                        role="dialog"
                        aria-label={focusedCard.name}
                        tabIndex={-1}
                        data-no-pokemon-swipe
                        onKeyDown={event => {
                            // preventDefault also keeps ← → from switching Pokémon (PokemonModal checks it).
                            if (event.key === 'Escape') setFocusedCardId(null);
                            else if (event.key === 'ArrowLeft') stepFocus(-1);
                            else if (event.key === 'ArrowRight') stepFocus(1);
                            else return;
                            event.preventDefault();
                        }}
                        onTouchStart={event => {
                            const touch = event.touches[0];
                            swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
                        }}
                        onTouchEnd={handleFocusTouchEnd}
                    >
                        <header className="pokemon-tcg-viewer__header">
                            <button type="button" className="pokemon-tcg-viewer__round" onClick={() => setFocusedCardId(null)} aria-label="Close">
                                <X size={18} strokeWidth={2.6} />
                            </button>
                            <div className="pokemon-tcg-viewer__title">
                                <strong>{focusedCard.name}</strong>
                                <span>{setNameOf(focusedCard)}{focusedCard.number ? ` · #${focusedCard.number}` : ''}</span>
                            </div>
                            <span className="pokemon-tcg-viewer__position">{focusedIndex + 1}/{viewerCards.length}</span>
                        </header>

                        <div className="pokemon-tcg-viewer__stage">
                            <button type="button" className="pokemon-tcg-viewer__round" onClick={() => stepFocus(-1)} aria-label="Previous card">
                                <ChevronLeft size={18} strokeWidth={2.6} />
                            </button>
                            <div className={`pokemon-tcg-viewer__card ${ownershipOf(focusedCard.id) === 'foil' ? 'pokemon-tcg-card--foil' : ''}`}>
                                <CardImage card={focusedCard} />
                                {focusedCard.lang === 'ja' && <span className="pokemon-tcg-lang-tag" title="Japan-exclusive card">JP</span>}
                                {ownershipOf(focusedCard.id) === 'foil' && <span className="pokemon-tcg-foil-tag">Foil</span>}
                            </div>
                            <button type="button" className="pokemon-tcg-viewer__round" onClick={() => stepFocus(1)} aria-label="Next card">
                                <ChevronRight size={18} strokeWidth={2.6} />
                            </button>
                        </div>

                        <div className="pokemon-tcg-viewer__ownership">
                            <span className="pokemon-tcg-viewer__label">In my collection</span>
                            <div className="pokemon-tcg-ownership" role="radiogroup" aria-label="In my collection">
                                {OWNERSHIP_OPTIONS.map(option => {
                                    const active = ownershipOf(focusedCard.id) === option.id;
                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            disabled={!selected}
                                            className={`pokemon-tcg-ownership__option pokemon-tcg-ownership__option--${option.id} ${active ? 'pokemon-tcg-ownership__option--active' : ''}`}
                                            onClick={() => onSetCardOwnership(focusedCard.id, option.id)}
                                        >
                                            {option.icon}
                                            {option.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {!selected && (
                                <p className="pokemon-tcg-viewer__hint">Add {pokemon.name} to your collection to mark cards.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
