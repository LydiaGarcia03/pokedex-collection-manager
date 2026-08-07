import { Check, Sparkle, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fetchTcgCards } from '../api/pokemonApi';
import type { Pokemon, TcgCard, TcgCardsApiResponse } from '../types/Pokemon';

const IMAGE_TIMEOUT_MS = 8000;

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

            <div className="pokemon-tcg-grid">
                {displayCards.map(card => {
                    const checked = selectedCardIds.includes(card.id);
                    const isFoil = foilCardIds.includes(card.id);

                    return (
                        <div
                            key={card.id}
                            className={`pokemon-tcg-card ${selected ? 'pokemon-tcg-card--selectable' : ''} ${checked ? 'pokemon-tcg-card--checked' : ''} ${collectionVisible && !checked ? 'pokemon-tcg-card--dimmed' : ''}`}
                            role={selected ? 'button' : undefined}
                            tabIndex={selected ? 0 : undefined}
                            onClick={() => selected && onToggleCard(card.id)}
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
        </div>
    );
}
