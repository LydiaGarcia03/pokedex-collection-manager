import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Gamepad2, IdCard, Info, Sparkles, X } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useEffectEvent, useState } from 'react';
import { cardsForForm, getLoadedTcgCards, getShinyImageUrl, isTcgCardCatalogLoaded, loadTcgCardCatalog } from '../api/pokemonApi';
import type { UseCollectionReturn } from '../hooks/useCollection';
import { useImageRetry } from '../hooks/useImageRetry';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Pokemon, PokemonSummary } from '../types/Pokemon';
import { PokemonGamesTab } from './PokemonGamesTab';
import { PokemonInfoTab } from './PokemonInfoTab';
import { PokemonModalMobile } from './PokemonModalMobile';
import { PokemonTcgTab } from './PokemonTcgTab';
import { TypeBadge } from './TypeBadge';

function getSmogonSlug(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/♀/g, '-f')
        .replace(/♂/g, '-m')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export type PokemonDetailTab = 'info' | 'games' | 'tcg';

// First rows of the TCG grid (3 per row on mobile, ~4 on desktop).
const NEIGHBOR_CARD_PREFETCH = 12;

interface PokemonModalProps {
    pokemonList: PokemonSummary[];
    activePokemonIndex: number | null;
    activePokemonDetail: Pokemon | null;
    detailLoading: boolean;
    onChangePokemon: (index: number) => void;
    onClose: () => void;
    collection: UseCollectionReturn;
    collectionVisible: boolean;
    onToggleCollectionVisible: () => void;
}

export function PokemonModal({
                                 pokemonList,
                                 activePokemonIndex,
                                 activePokemonDetail,
                                 detailLoading,
                                 onChangePokemon,
                                 onClose,
                                 collection,
                                 collectionVisible,
                                 onToggleCollectionVisible,
                             }: PokemonModalProps) {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState<PokemonDetailTab>('info');
    const [showShiny, setShowShiny] = useState(false);

    const summary = activePokemonIndex !== null ? pokemonList[activePokemonIndex] : null;
    const shinyUrl = summary ? getShinyImageUrl(summary.imageCode) : null;
    const rawImageSrc = summary ? (showShiny ? shinyUrl : (summary.imageUrlXl ?? summary.imageUrl)) : null;
    const { src: imageSrc, failed: imageFailed, onError: onImageError } = useImageRetry(rawImageSrc);

    // The TCG card count next to the tab reads the card catalog, which otherwise only loads when
    // the TCG tab is opened. Load it as soon as the detail opens so the count shows right away,
    // like the Games count does.
    const [, setTcgCatalogLoaded] = useState(isTcgCardCatalogLoaded);
    const detailOpen = summary !== null;
    useEffect(() => {
        if (!detailOpen || isTcgCardCatalogLoaded()) return;
        let cancelled = false;
        loadTcgCardCatalog().then(() => { if (!cancelled) setTcgCatalogLoaded(true); });
        return () => { cancelled = true; };
    }, [detailOpen]);

    // While the TCG tab is open, start downloading the first cards of the previous and next
    // Pokémon, so a swipe or arrow lands on cards that are already loaded.
    const previousPokemon = activePokemonIndex !== null ? pokemonList[activePokemonIndex - 1] : undefined;
    const nextPokemon = activePokemonIndex !== null ? pokemonList[activePokemonIndex + 1] : undefined;
    useEffect(() => {
        if (activeTab !== 'tcg') return;
        for (const neighbor of [previousPokemon, nextPokemon]) {
            if (!neighbor) continue;
            const cards = cardsForForm(getLoadedTcgCards(neighbor.name) ?? [], neighbor);
            for (const card of cards.filter(c => c.imageUrl).slice(0, NEIGHBOR_CARD_PREFETCH)) {
                new Image().src = card.imageUrl!;
            }
        }
    }, [activeTab, previousPokemon, nextPokemon]);

    // Previous (-1) / next (+1) Pokémon: the arrows on screen, the phone swipe and the desktop keys.
    function changePokemon(direction: -1 | 1) {
        if (activePokemonIndex === null) return;
        const target = activePokemonIndex + direction;
        if (target < 0 || target >= pokemonList.length) return;
        collection.commitPendingCleanup(pokemonList[activePokemonIndex].id);
        setShowShiny(false);
        onChangePokemon(target);
    }

    // Desktop: ← → switch Pokémon (the phone layout swipes instead). Skipped while typing, e.g.
    // in the TCG search.
    const onArrowKey = useEffectEvent(changePokemon);
    const isOpen = activePokemonIndex !== null;
    useEffect(() => {
        if (isMobile || !isOpen) return;
        function handleKeyDown(event: KeyboardEvent) {
            if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
            if ((event.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')) return;
            if (event.key === 'ArrowLeft') onArrowKey(-1);
            else if (event.key === 'ArrowRight') onArrowKey(1);
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMobile, isOpen]);

    if (!summary || activePokemonIndex === null) {
        return null;
    }

    const currentIndex = activePokemonIndex;
    const selected = collection.isPokemonSelected(summary.id);
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < pokemonList.length - 1;
    const previousSummary = hasPrevious ? pokemonList[currentIndex - 1] : null;
    const nextSummary = hasNext ? pokemonList[currentIndex + 1] : null;

    const imageAlt = summary.formName ? `${summary.name} - ${summary.formName}` : summary.name;

    function handleClose() {
        collection.commitPendingCleanup(summary!.id);
        onClose();
    }

    const handlePrevious = () => changePokemon(-1);
    const handleNext = () => changePokemon(1);

    // Same type color as the phone header (see PokemonModalMobile), used by the desktop hero column,
    // plus the first type's symbol for its corner (scripts/generate-type-symbols.py).
    const firstType = summary.types[0]?.toLowerCase() ?? 'normal';
    const typeColorStyle = { '--type-color': `var(--type-${firstType})` } as CSSProperties;
    const typeSymbolStyle = { '--type-symbol': `url(${import.meta.env.BASE_URL}images/types/symbol-${firstType}.png)` } as CSSProperties;
    const loadedTcgCards = getLoadedTcgCards(summary.name);
    const tcgCardCount = loadedTcgCards ? cardsForForm(loadedTcgCards, summary).length : null;

    const tabContent = detailLoading ? (
        <div className="pokemon-detail-loading">
            <span className="pokemon-detail-loading__spinner" />
        </div>
    ) : activePokemonDetail ? (
        <>
            {activeTab === 'info' && (
                <PokemonInfoTab pokemon={activePokemonDetail} />
            )}

            {activeTab === 'games' && (
                <PokemonGamesTab
                    pokemon={activePokemonDetail}
                    selected={selected}
                    collectionVisible={collectionVisible}
                    selectedGameIds={collection.getSelectedGameIds(summary.id)}
                    onToggleGame={gameId => collection.toggleGame(summary.id, gameId)}
                />
            )}

            {activeTab === 'tcg' && (
                <PokemonTcgTab
                    key={activePokemonDetail.id}
                    pokemon={activePokemonDetail}
                    selected={selected}
                    collectionVisible={collectionVisible}
                    selectedCardIds={collection.getSelectedCardIds(summary.id)}
                    onToggleCard={cardId => collection.toggleCard(summary.id, cardId)}
                    foilCardIds={collection.getFoilCardIds(summary.id)}
                    onSetCardOwnership={(cardId, ownership) => collection.setCardOwnership(summary.id, cardId, ownership)}
                />
            )}
        </>
    ) : null;

    const externalLinks = (
        <>
            <span className="pokemon-detail-modal__footer-label">More information at:</span>
            <a
                href={`https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(summary.name.replace(/ /g, '_'))}_(Pokémon)`}
                target="_blank"
                rel="noopener noreferrer"
                className="pokemon-detail-modal__external-link"
            >
                Bulbapedia ↗
            </a>
            <a
                href={`https://www.smogon.com/dex/sv/pokemon/${getSmogonSlug(summary.name)}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="pokemon-detail-modal__external-link"
            >
                Smogon ↗
            </a>
        </>
    );

    if (isMobile) {
        return (
            <PokemonModalMobile
                summary={summary}
                imageSrc={imageSrc && !imageFailed ? imageSrc : null}
                imageAlt={showShiny ? `${imageAlt} (Shiny)` : imageAlt}
                onImageError={onImageError}
                previousSummary={previousSummary}
                nextSummary={nextSummary}
                isPokemonSelected={collection.isPokemonSelected}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onClose={handleClose}
                selected={selected}
                onToggleSelected={() => collection.togglePokemon(summary.id)}
                collectionVisible={collectionVisible}
                onToggleCollectionVisible={onToggleCollectionVisible}
                showShiny={showShiny}
                onToggleShiny={() => setShowShiny(value => !value)}
                activeTab={activeTab}
                onChangeTab={setActiveTab}
                externalLinks={externalLinks}
            >
                {tabContent}
            </PokemonModalMobile>
        );
    }

    const tabs: { id: PokemonDetailTab; label: string; icon: ReactNode; count: string | null }[] = [
        { id: 'info', label: 'Info', icon: <Info size={18} />, count: null },
        { id: 'games', label: 'Games', icon: <Gamepad2 size={18} />, count: activePokemonDetail?.games ? `${activePokemonDetail.games.length}` : null },
        { id: 'tcg', label: 'TCG', icon: <IdCard size={18} />, count: tcgCardCount != null ? `${tcgCardCount} cards` : null },
    ];

    return (
        <div className="pokemon-detail-backdrop" role="presentation" onClick={handleClose}>
            <section
                className="pokemon-detail-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`${summary.name} details`}
                style={typeColorStyle}
                onClick={event => event.stopPropagation()}
            >
                <aside className="pokemon-detail-hero">
                    <span className="pokemon-detail-hero__symbol" style={typeSymbolStyle} aria-hidden="true" />
                    <div className="pokemon-detail-hero__actions">
                        <button type="button" className="pokemon-detail-hero__icon-button" onClick={handleClose} aria-label="Close" title="Close">
                            <X size={18} />
                        </button>
                        <span className="pokemon-detail-hero__spacer" />
                        <button
                            type="button"
                            className={`pokemon-detail-hero__icon-button ${showShiny ? 'pokemon-detail-hero__icon-button--shiny' : ''}`}
                            onClick={() => setShowShiny(value => !value)}
                            aria-pressed={showShiny}
                            title={showShiny ? 'Show regular' : 'Show shiny'}
                        >
                            <Sparkles size={18} />
                        </button>
                        <button
                            type="button"
                            className="pokemon-detail-hero__icon-button"
                            onClick={onToggleCollectionVisible}
                            aria-pressed={collectionVisible}
                            title={collectionVisible ? 'Hide collection' : 'Show collection'}
                        >
                            {collectionVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <button
                            type="button"
                            className={`pokemon-detail-hero__select ${selected ? 'pokemon-detail-hero__select--selected' : ''}`}
                            onClick={() => collection.togglePokemon(summary.id)}
                            aria-pressed={selected}
                            aria-label={selected ? `Remove ${summary.name} from collection` : `Add ${summary.name} to collection`}
                        >
                            {selected && <Check size={24} strokeWidth={3.4} />}
                        </button>
                    </div>

                    {/* The Pokémon stands on a ground band with a contact shadow, so it doesn't float. */}
                    <div className="pokemon-detail-hero__stage">
                        <span className="pokemon-detail-hero__ground" aria-hidden="true" />
                        <span className="pokemon-detail-hero__contact-shadow" aria-hidden="true" />
                        {imageSrc && !imageFailed && (
                            <img
                                src={imageSrc}
                                alt={showShiny ? `${imageAlt} (Shiny)` : imageAlt}
                                className="pokemon-detail-hero__image"
                                onError={onImageError}
                            />
                        )}
                    </div>

                    <span className="pokemon-detail-hero__dex">#{summary.dexNumberFormatted}</span>
                    <strong className="pokemon-detail-hero__name">{summary.name}</strong>
                    {summary.formName && <span className="pokemon-detail-hero__form">{summary.formName}</span>}
                    <div className="pokemon-detail-hero__types">
                        {summary.types.map(type => (
                            <TypeBadge key={type} type={type} />
                        ))}
                    </div>

                    <nav className="pokemon-detail-hero__tabs" aria-label="Detail tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                className={`pokemon-detail-hero__tab ${activeTab === tab.id ? 'pokemon-detail-hero__tab--active' : ''}`}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon}
                                {tab.label}
                                {tab.count && <small>{tab.count}</small>}
                            </button>
                        ))}
                    </nav>

                    <div className="pokemon-detail-hero__nav">
                        <button
                            type="button"
                            className="pokemon-detail-hero__nav-button"
                            onClick={handlePrevious}
                            disabled={!hasPrevious}
                            aria-label="Previous Pokémon"
                        >
                            <ChevronLeft size={18} />
                            {previousSummary && <img src={previousSummary.imageUrl} alt="" />}
                            {previousSummary?.id}
                        </button>
                        <button
                            type="button"
                            className="pokemon-detail-hero__nav-button"
                            onClick={handleNext}
                            disabled={!hasNext}
                            aria-label="Next Pokémon"
                        >
                            {nextSummary?.id}
                            {nextSummary && <img src={nextSummary.imageUrl} alt="" />}
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </aside>

                <section className="pokemon-detail-content">
                    <div className="pokemon-detail-panel">
                        {tabContent}
                    </div>
                    <footer className="pokemon-detail-modal__footer">
                        {externalLinks}
                    </footer>
                </section>
            </section>
        </div>
    );
}
