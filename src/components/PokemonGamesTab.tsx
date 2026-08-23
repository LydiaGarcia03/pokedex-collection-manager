import { Check } from 'lucide-react';
import { useImageRetry } from '../hooks/useImageRetry';
import type { Pokemon, PokemonGame } from '../types/Pokemon';

interface PokemonGamesTabProps {
    pokemon: Pokemon;
    selected: boolean;
    collectionVisible: boolean;
    selectedGameIds: string[];
    onToggleGame: (gameId: string) => void;
}

function GameIcon({ game }: { game: PokemonGame }) {
    const { src, failed, onError } = useImageRetry(game.iconUrl);

    if (!src || failed) {
        return (
            <span className="pokemon-game-item__placeholder">
                {game.name.charAt(0).toUpperCase()}
            </span>
        );
    }

    return (
        <img
            src={src}
            alt={game.name}
            onError={onError}
        />
    );
}

export function PokemonGamesTab({
                                    pokemon,
                                    selected,
                                    collectionVisible,
                                    selectedGameIds,
                                    onToggleGame
                                }: PokemonGamesTabProps) {
    const games = pokemon.games;
    const hasGames = games != null && games.length > 0;

    return (
        <div className="pokemon-games-tab">
            <p className="pokemon-tab-description">
                List of games this pokemons shows up.
                <br/>
                When you select this pokemon, you can mark the games
                individually for your collection as well.
            </p>

            {hasGames ? (
                <div className="pokemon-game-grid">
                    {games!.map(game => {
                        const checked = selectedGameIds.includes(game.id);

                        return (
                            <button
                                key={game.id}
                                type="button"
                                className={`pokemon-game-item ${selected ? 'pokemon-game-item--selectable' : ''} ${checked ? 'pokemon-game-item--checked' : ''} ${collectionVisible && !checked ? 'pokemon-game-item--dimmed' : ''}`}
                                onClick={() => selected && onToggleGame(game.id)}
                                title={game.name}
                            >
                                {selected && (
                                    <span
                                        className={`selectable-item-checkbox selectable-item-checkbox--compact selectable-item-checkbox--blurred ${
                                            checked ? 'selectable-item-checkbox--selected' : ''
                                        }`}
                                    >
                                        {checked && <Check size={10} strokeWidth={3.6} />}
                                    </span>
                                )}

                                <GameIcon game={game} />

                                <small>{game.name}</small>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <p className="pokemon-info-placeholder">
                    No game found for this Pokemon.
                </p>
            )}
        </div>
    );
}
