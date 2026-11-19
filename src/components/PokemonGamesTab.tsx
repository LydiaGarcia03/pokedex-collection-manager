import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useImageRetry } from '../hooks/useImageRetry';
import type { Pokemon, PokemonGame } from '../types/Pokemon';
import { getGameColor, getGameYear } from '../utils/gameDetails';

interface PokemonGamesTabProps {
    pokemon: Pokemon;
    selected: boolean;
    collectionVisible: boolean;
    selectedGameIds: string[];
    onToggleGame: (gameId: string) => void;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

function GameIcon({ game }: { game: PokemonGame }) {
    const { src, failed, onError } = useImageRetry(game.iconUrl);

    if (!src || failed) {
        return (
            <span className="pokemon-game-swatch__placeholder">
                {game.name.charAt(0).toUpperCase()}
            </span>
        );
    }

    return <img className="pokemon-game-swatch__icon" src={src} alt="" onError={onError} />;
}

function describeGame(game: PokemonGame): string {
    const generation = game.generation ? `Gen ${ROMAN[game.generation - 1] ?? game.generation}` : 'Mobile';
    const year = getGameYear(game.id);
    return [generation, year, game.dlc?.length ? 'DLC' : null].filter(Boolean).join(' · ');
}

/**
 * One block per game, in its signature color (option H4 of docs/games-tab-mock.html). Games can be
 * marked once the Pokémon itself is in the collection, with the same corner checkbox as the TCG
 * cards. Like the Pokémon cards and the TCG cards, games you don't have turn gray only in
 * "collection visible" mode.
 */
export function PokemonGamesTab({
                                    pokemon,
                                    selected,
                                    collectionVisible,
                                    selectedGameIds,
                                    onToggleGame,
                                }: PokemonGamesTabProps) {
    const games = pokemon.games ?? [];

    if (games.length === 0) {
        return (
            <div className="pokemon-games-tab">
                <p className="pokemon-info-placeholder">No game found for this Pokémon.</p>
            </div>
        );
    }

    return (
        <div className="pokemon-games-tab">
            {!selected && (
                <p className="pokemon-games-tab__hint">Add {pokemon.name} to your collection to mark the games you have.</p>
            )}

            <div className="pokemon-game-swatches">
                {games.map(game => {
                    const owned = selectedGameIds.includes(game.id);
                    const dlcNames = game.dlc?.map(dlc => dlc.name).join(', ');

                    return (
                        <button
                            key={game.id}
                            type="button"
                            className={[
                                'pokemon-game-swatch',
                                selected ? 'pokemon-game-swatch--selectable' : '',
                                owned ? 'pokemon-game-swatch--owned' : '',
                                collectionVisible && !owned ? 'pokemon-game-swatch--muted' : '',
                            ].join(' ')}
                            style={{ '--game-color': getGameColor(game.id) } as CSSProperties}
                            onClick={() => selected && onToggleGame(game.id)}
                            aria-pressed={selected ? owned : undefined}
                            title={dlcNames ? `${game.name} (DLC: ${dlcNames})` : game.name}
                        >
                            <GameIcon game={game} />
                            {selected && (
                                <span
                                    className={`selectable-item-checkbox selectable-item-checkbox--compact selectable-item-checkbox--blurred ${
                                        owned ? 'selectable-item-checkbox--selected' : ''
                                    }`}
                                    aria-hidden="true"
                                >
                                    {owned && <Check size={18} strokeWidth={3.2} />}
                                </span>
                            )}
                            <strong>{game.name}</strong>
                            <small>{describeGame(game)}</small>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
