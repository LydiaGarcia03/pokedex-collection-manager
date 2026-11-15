import { Check, ChevronLeft, ChevronRight, MinusCircle, Search, Sparkle, WifiOff, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, TouchEvent } from 'react';
import { fetchTcgCards, getLoadedTcgCards, getLoadedTcgSetNames, loadTcgSetNames } from '../api/pokemonApi';
import { useIsMobile } from '../hooks/useIsMobile';
import type { CardOwnership, Pokemon, TcgCard, TcgCardsApiResponse } from '../types/Pokemon';

const IMAGE_TIMEOUT_MS = 8000;
const LONG_PRESS_MS = 500;
const SWIPE_MIN_PX = 50;

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
    { id: 'foil', label: 'Yes, foil', icon: <Sparkle size={17} strokeWidth={2.4} fill="currentColor" /> },
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

    useEffect(() => {
        if (!card.imageUrl) return;
        timerRef.current = window.setTimeout(() => setImgFailed(true), IMAGE_TIMEOUT_MS);
        return () => {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        };
    }, [card.imageUrl]);

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
    onToggleFoil: (cardId: string) => void;
    onSetCardOwnership: (cardId: string, ownership: CardOwnership) => void;
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
    onToggleFoil,
    onSetCardOwnership,
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
    // Mobile viewer: the cards it pages through, frozen when it opens — otherwise marking a card
    // "No" while filtering by Owned would drop it from the list and close the viewer mid-review.
    const [viewerCardIds, setViewerCardIds] = useState<string[]>([]);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    // A long press (touch, non-mobile layout) fires a synthetic click on release — this ref
    // suppresses that one click so it doesn't also toggle the card right after opening the focus view.
    const suppressNextClickRef = useRef(false);
    const longPressTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

    function clearLongPressTimer() {
        if (longPressTimerRef.current !== null) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }

    function handleCardTouchStart(card: TcgCard) {
        if (isMobile || !card.imageUrl) return; // mobile: a plain tap already opens the card
        clearLongPressTimer();
        longPressTimerRef.current = window.setTimeout(() => {
            suppressNextClickRef.current = true;
            setFocusedCardId(card.id);
        }, LONG_PRESS_MS);
    }

    function handleCardClick(card: TcgCard) {
        clearLongPressTimer();
        if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
        }
        if (isMobile) {
            openViewer(card.id);
        } else if (selected) {
            onToggleCard(card.id);
        }
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

    if (!tcgData || tcgData.cards.length === 0) {
        return (
            <div className="pokemon-tcg-tab">
                <p className="pokemon-tab-empty">
                    No TCG cards found for {pokemon.name}.
                </p>
            </div>
        );
    }

    const isMegaForm = pokemon.id.includes('-mega');
    const isGmaxForm = pokemon.id.includes('-gmax');

    let displayCards = tcgData.cards;
    if (isMegaForm) {
        const megaCards = tcgData.cards.filter(c => /^(M |Mega )/i.test(c.name));
        if (megaCards.length > 0) {
            const isFormX = / X$/i.test(pokemon.formName ?? '');
            const isFormY = / Y$/i.test(pokemon.formName ?? '');
            if (isFormX) {
                displayCards = megaCards.filter(c => !/ Y /i.test(c.name));
            } else if (isFormY) {
                displayCards = megaCards.filter(c => !/ X /i.test(c.name));
            } else {
                displayCards = megaCards;
            }
        }
    } else if (isGmaxForm) {
        const filtered = tcgData.cards.filter(c => c.name.includes('VMAX'));
        if (filtered.length > 0) displayCards = filtered;
    }

    // Cards without a resolved image (placeholder-only) sort after everything else, so the
    // grid leads with real card art. Array.prototype.sort is stable, so order is otherwise
    // preserved within each group.
    displayCards = [...displayCards].sort((a, b) => Number(!a.imageUrl) - Number(!b.imageUrl));

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

    const viewerCards = isMobile
        ? viewerCardIds.map(id => displayCards.find(c => c.id === id)).filter((c): c is TcgCard => c !== undefined)
        : displayCards;
    const focusedIndex = focusedCardId ? viewerCards.findIndex(c => c.id === focusedCardId) : -1;
    const focusedCard = focusedIndex >= 0 ? viewerCards[focusedIndex] : null;

    function openViewer(cardId: string) {
        setViewerCardIds(visibleCards.map(c => c.id));
        setFocusedCardId(cardId);
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
                                {filter.id === 'foil' && <Sparkle size={12} strokeWidth={2.4} fill="currentColor" />}
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
        </div>
    );

    return (
        <div className="pokemon-tcg-tab">
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
                <defs>
                    <linearGradient id="foil-toggle-silver" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="40%" stopColor="#d4d4d8" />
                        <stop offset="50%" stopColor="#8a8a94" />
                        <stop offset="60%" stopColor="#d4d4d8" />
                        <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                </defs>
            </svg>

            {focusedCard && !isMobile ? (
                <div className="pokemon-tcg-card-focus">
                    <button
                        type="button"
                        className="pokemon-tcg-card-focus__close"
                        onClick={() => setFocusedCardId(null)}
                        title="Close"
                    >
                        <X size={22} strokeWidth={2.4} />
                    </button>
                    <img src={focusedCard.imageUrl ?? undefined} alt={focusedCard.name} />
                </div>
            ) : (
                <>
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

                                return (
                                    <div
                                        key={card.id}
                                        className={`pokemon-tcg-card ${selected ? 'pokemon-tcg-card--selectable' : ''} ${checked ? 'pokemon-tcg-card--checked' : ''} ${isFoil ? 'pokemon-tcg-card--foil' : ''} ${collectionVisible && !checked ? 'pokemon-tcg-card--dimmed' : ''} ${card.imageUrl ? 'pokemon-tcg-card--zoomable' : ''}`}
                                        role={selected || isMobile ? 'button' : undefined}
                                        tabIndex={selected || isMobile ? 0 : undefined}
                                        onClick={() => handleCardClick(card)}
                                        onDoubleClick={() => !isMobile && card.imageUrl && setFocusedCardId(card.id)}
                                        onTouchStart={() => handleCardTouchStart(card)}
                                        onTouchEnd={clearLongPressTimer}
                                        onTouchMove={clearLongPressTimer}
                                        onTouchCancel={clearLongPressTimer}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleCardClick(card);
                                            }
                                        }}
                                        title={`${card.name}${card.setId ? ` · ${setNameOf(card)}` : ''}${card.number ? ` #${card.number}` : ''}`}
                                    >
                                        {selected && (
                                            <span
                                                className={`selectable-item-checkbox selectable-item-checkbox--compact selectable-item-checkbox--blurred ${
                                                    checked ? 'selectable-item-checkbox--selected' : ''
                                                }`}
                                            >
                                                {checked && <Check size={20} strokeWidth={3.2} />}
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

                                        <CardImage card={card} lazy />

                                        {checked && !isMobile && (
                                            <button
                                                type="button"
                                                className={`pokemon-tcg-card__foil-toggle ${isFoil ? 'pokemon-tcg-card__foil-toggle--active' : ''}`}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    onToggleFoil(card.id);
                                                }}
                                                title={isFoil ? 'Marked as foil' : 'Mark as foil'}
                                            >
                                                <Sparkle size={16} strokeWidth={2.4} fill={isFoil ? 'url(#foil-toggle-silver)' : 'none'} />
                                            </button>
                                        )}

                                        {isFoil && isMobile && (
                                            <span className="pokemon-tcg-card__foil-badge" aria-label="Foil">
                                                <Sparkle size={12} strokeWidth={2.4} fill="currentColor" />
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {focusedCard && isMobile && (
                <div
                    className="pokemon-tcg-viewer"
                    role="dialog"
                    aria-label={focusedCard.name}
                    data-no-pokemon-swipe
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
            )}
        </div>
    );
}
