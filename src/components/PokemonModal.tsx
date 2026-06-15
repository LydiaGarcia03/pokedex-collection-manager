import { Check, ChevronLeft, ChevronRight, Gamepad2, IdCard, Info, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { UseCollectionReturn } from '../hooks/useCollection';
import type { Pokemon, PokemonSummary } from '../types/Pokemon';
import { PokemonGamesTab } from './PokemonGamesTab';
import { PokemonInfoTab } from './PokemonInfoTab';
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

type PokemonDetailTab = 'info' | 'games' | 'tcg';

interface PokemonModalProps {
    pokemonList: PokemonSummary[];
    activePokemonIndex: number | null;
    activePokemonDetail: Pokemon | null;
    detailLoading: boolean;
    onChangePokemon: (index: number) => void;
    onClose: () => void;
    collection: UseCollectionReturn;
    collectionVisible: boolean;
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
                             }: PokemonModalProps) {
    const [activeTab, setActiveTab] = useState<PokemonDetailTab>('info');
    const [showShiny, setShowShiny] = useState(false);

    const summary = activePokemonIndex !== null ? pokemonList[activePokemonIndex] : null;

    if (!summary || activePokemonIndex === null) {
        return null;
    }

    const currentIndex = activePokemonIndex;
    const selected = collection.isPokemonSelected(summary.id);
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < pokemonList.length - 1;
    const previousSummary = hasPrevious ? pokemonList[currentIndex - 1] : null;
    const nextSummary = hasNext ? pokemonList[currentIndex + 1] : null;

    const shinyUrl = `https://static.pokepc.net/images/pokemon/home3d-icon-xl/shiny/${summary.imageCode}.webp`;
    const imageAlt = summary.formName ? `${summary.name} - ${summary.formName}` : summary.name;

    function handleClose() {
        collection.commitPendingCleanup(summary!.id);
        onClose();
    }

    function handlePrevious() {
        if (!hasPrevious) return;
        collection.commitPendingCleanup(summary!.id);
        setShowShiny(false);
        onChangePokemon(currentIndex - 1);
    }

    function handleNext() {
        if (!hasNext) return;
        collection.commitPendingCleanup(summary!.id);
        setShowShiny(false);
        onChangePokemon(currentIndex + 1);
    }

    return (
        <div className="pokemon-detail-backdrop" role="presentation" onClick={handleClose}>
            <section
                className="pokemon-detail-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Detalhes de ${summary.name}`}
                onClick={event => event.stopPropagation()}
            >
                <header className="pokemon-detail-modal__header">
                    <button
                        className={`pokemon-detail-modal__select ${selected ? 'pokemon-detail-modal__select--selected' : ''}`}
                        type="button"
                        aria-label={selected ? `Remover ${summary.name} da coleção` : `Adicionar ${summary.name} à coleção`}
                        onClick={() => collection.togglePokemon(summary.id)}
                    >
                        {selected && <Check size={30} strokeWidth={3.4} />}
                    </button>

                    <button
                        type="button"
                        className="pokemon-detail-modal__close"
                        onClick={handleClose}
                    >
                        Fechar
                    </button>
                </header>

                <div className="pokemon-detail-modal__layout">
                    <aside className="pokemon-detail-sidebar">
                        <div className="pokemon-detail-nav">
                            <button
                                type="button"
                                className="pokemon-detail-nav__button pokemon-detail-nav__button--previous"
                                onClick={handlePrevious}
                                disabled={!hasPrevious}
                                aria-label="Pokémon anterior"
                            >
                                <ChevronLeft size={34} />
                                <span>{previousSummary?.id ?? ''}</span>
                            </button>

                            <div className="pokemon-detail-nav__spacer" aria-hidden="true" />

                            <button
                                type="button"
                                className="pokemon-detail-nav__button pokemon-detail-nav__button--next"
                                onClick={handleNext}
                                disabled={!hasNext}
                                aria-label="Próximo Pokémon"
                            >
                                <span>{nextSummary?.id ?? ''}</span>
                                <ChevronRight size={34} />
                            </button>
                        </div>

                        <div className="pokemon-detail-sidebar__card">
                            <img
                                src={showShiny ? shinyUrl : (summary.imageUrlXl ?? summary.imageUrl)}
                                alt={showShiny ? `${imageAlt} (Shiny)` : imageAlt}
                                className="pokemon-detail-sidebar__image"
                            />

                            <button
                                type="button"
                                className={`pokemon-detail-sidebar__shiny-toggle ${showShiny ? 'pokemon-detail-sidebar__shiny-toggle--active' : ''}`}
                                onClick={() => setShowShiny(s => !s)}
                                title={showShiny ? 'Ver versão normal' : 'Ver versão shiny'}
                            >
                                <Sparkles size={13} />
                                Shiny
                            </button>

                            <div className="pokemon-detail-sidebar__info-row">
                                <div className="pokemon-detail-sidebar__text">
                                    <span className="pokemon-detail-sidebar__dex">#{summary.dexNumberFormatted}</span>
                                    <strong className="pokemon-detail-sidebar__name">{summary.name}</strong>
                                    {summary.formName && (
                                        <span className="pokemon-detail-sidebar__form">{summary.formName}</span>
                                    )}
                                </div>

                                <div className="pokemon-detail-sidebar__types">
                                    {summary.types.map(type => (
                                        <TypeBadge key={type} type={type} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    <section className="pokemon-detail-content">
                        <nav className="pokemon-detail-tabs" aria-label="Abas de detalhes">
                            <button
                                type="button"
                                className={activeTab === 'info' ? 'pokemon-detail-tabs__tab pokemon-detail-tabs__tab--active' : 'pokemon-detail-tabs__tab'}
                                onClick={() => setActiveTab('info')}
                            >
                                <Info size={16} />
                                <span>Info</span>
                            </button>

                            <button
                                type="button"
                                className={activeTab === 'games' ? 'pokemon-detail-tabs__tab pokemon-detail-tabs__tab--active' : 'pokemon-detail-tabs__tab'}
                                onClick={() => setActiveTab('games')}
                            >
                                <Gamepad2 size={16} />
                                <span>Jogos</span>
                            </button>

                            <button
                                type="button"
                                className={activeTab === 'tcg' ? 'pokemon-detail-tabs__tab pokemon-detail-tabs__tab--active' : 'pokemon-detail-tabs__tab'}
                                onClick={() => setActiveTab('tcg')}
                            >
                                <IdCard size={16} />
                                <span>TCG</span>
                            </button>
                        </nav>

                        <div className="pokemon-detail-panel">
                            {detailLoading ? (
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
                                            pokemon={activePokemonDetail}
                                            selected={selected}
                                            collectionVisible={collectionVisible}
                                            selectedCardIds={collection.getSelectedCardIds(summary.id)}
                                            onToggleCard={cardId => collection.toggleCard(summary.id, cardId)}
                                        />
                                    )}
                                </>
                            ) : null}
                        </div>
                    </section>
                </div>

                <footer className="pokemon-detail-modal__footer">
                    <span className="pokemon-detail-modal__footer-label">Mais informações em:</span>
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
                </footer>
            </section>
        </div>
    );
}
