import { Check, Sparkle, WifiOff, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fetchTcgCards } from '../api/pokemonApi';
import type { Pokemon, TcgCard, TcgCardsApiResponse } from '../types/Pokemon';

const IMAGE_TIMEOUT_MS = 8000;
const LONG_PRESS_MS = 500;

function CardImage({ card }: { card: TcgCard }) {
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
}

export function PokemonTcgTab({
    pokemon,
    selected,
    collectionVisible,
    selectedCardIds,
    onToggleCard,
    foilCardIds,
    onToggleFoil,
}: PokemonTcgTabProps) {
    const [tcgData, setTcgData] = useState<TcgCardsApiResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

    // A long press (mobile) fires a synthetic click on release — this ref suppresses that one
    // click so it doesn't also toggle the card's selection right after opening the focus view.
    const suppressNextClickRef = useRef(false);
    const longPressTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

    function clearLongPressTimer() {
        if (longPressTimerRef.current !== null) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }

    function handleCardTouchStart(card: TcgCard) {
        if (!card.imageUrl) return;
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
        if (selected) onToggleCard(card.id);
    }

    // Reset the focus view whenever the displayed Pokémon (species or form) changes, so it
    // doesn't stay open across a species/form switch.
    useEffect(() => {
        setFocusedCardId(null);
    }, [pokemon.id]);

    useEffect(() => {
        let cancelled = false;

        setTcgData(null);
        setLoading(true);

        // Cards are keyed by pokemon.name (not id) in tcg-cards.json
        fetchTcgCards(pokemon.name)
            .then(data => {
                if (!cancelled) setTcgData(data);
            })
            .catch(() => {
                if (!cancelled) setTcgData({ cards: [], dataUnavailable: true });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [pokemon.name]); // Re-run only when species changes (not on form change within same species)

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
                    <strong>TCGdex indisponível</strong>
                    <p>A API de cartas TCG está fora do ar ou inacessível no momento.<br />Tente novamente mais tarde.</p>
                </div>
            </div>
        );
    }

    if (!tcgData || tcgData.cards.length === 0) {
        return (
            <div className="pokemon-tcg-tab">
                <p className="pokemon-tab-empty">
                    Nenhuma carta TCG encontrada para {pokemon.name}.
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

    const focusedCard = focusedCardId ? displayCards.find(c => c.id === focusedCardId) ?? null : null;

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

            {focusedCard ? (
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
                <div className="pokemon-tcg-grid">
                    {displayCards.map(card => {
                        const checked = selectedCardIds.includes(card.id);
                        const isFoil = foilCardIds.includes(card.id);

                        return (
                            <div
                                key={card.id}
                                className={`pokemon-tcg-card ${selected ? 'pokemon-tcg-card--selectable' : ''} ${checked ? 'pokemon-tcg-card--checked' : ''} ${collectionVisible && !checked ? 'pokemon-tcg-card--dimmed' : ''} ${card.imageUrl ? 'pokemon-tcg-card--zoomable' : ''}`}
                                role={selected ? 'button' : undefined}
                                tabIndex={selected ? 0 : undefined}
                                onClick={() => handleCardClick(card)}
                                onDoubleClick={() => card.imageUrl && setFocusedCardId(card.id)}
                                onTouchStart={() => handleCardTouchStart(card)}
                                onTouchEnd={clearLongPressTimer}
                                onTouchMove={clearLongPressTimer}
                                onTouchCancel={clearLongPressTimer}
                                onKeyDown={e => {
                                    if (selected && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        onToggleCard(card.id);
                                    }
                                }}
                                title={`${card.name}${card.setId ? ` · ${card.setId}` : ''}${card.number ? ` #${card.number}` : ''}`}
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

                                <CardImage card={card} />

                                {checked && (
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
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
