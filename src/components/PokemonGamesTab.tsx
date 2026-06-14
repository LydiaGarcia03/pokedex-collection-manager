import { Check } from 'lucide-react';
import { useState } from 'react';
import type { Pokemon, PokemonGame } from '../types/Pokemon';

interface PokemonGamesTabProps {
    pokemon: Pokemon;
    selected: boolean;
    selectedGameIds: string[];
    onToggleGame: (gameId: string) => void;
}

function GameIcon({ game }: { game: PokemonGame }) {
    const [failed, setFailed] = useState(false);

    if (!game.iconUrl || failed) {
        return (
            <span className="pokemon-game-item__placeholder">
                {game.name.charAt(0).toUpperCase()}
            </span>
        );
    }

    return (
        <img
            src={game.iconUrl}
            alt={game.name}
            onError={() => setFailed(true)}
        />
    );
}

export function PokemonGamesTab({
                                    pokemon,
                                    selected,
                                    selectedGameIds,
                                    onToggleGame
                                }: PokemonGamesTabProps) {
    const games = pokemon.games;
    const hasGames = games != null && games.length > 0;

    return (
        <div className="pokemon-games-tab">
            <h2>Jogos digitais</h2>

            <p className="pokemon-tab-description">
                Jogos em que este Pokémon aparece. Quando o Pokémon está selecionado na coleção,
                você pode marcar os jogos individualmente.
            </p>

            {hasGames ? (
                <div className="pokemon-game-grid">
                    {games!.map(game => {
                        const checked = selectedGameIds.includes(game.id);

                        return (
                            <button
                                key={game.id}
                                type="button"
                                className={`pokemon-game-item ${selected ? 'pokemon-game-item--selectable' : ''} ${checked ? 'pokemon-game-item--checked' : ''}`}
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
                    Nenhum jogo encontrado para este Pokémon.
                </p>
            )}
        </div>
    );
}
