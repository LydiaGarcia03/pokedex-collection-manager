import { Check } from 'lucide-react';
import type { PokemonSummary } from '../types/Pokemon';
import { TypeBadge } from './TypeBadge';

interface PokemonCardProps {
    pokemon: PokemonSummary;
    selected: boolean;
    collectionVisible: boolean;
    onToggleSelected: (id: string) => void;
    onOpenDetails: () => void;
    onCommitDeselection: (id: string) => void;
}

export function PokemonCard({
                                pokemon,
                                selected,
                                collectionVisible,
                                onToggleSelected,
                                onOpenDetails,
                                onCommitDeselection
                            }: PokemonCardProps) {
    function handleToggleSelected(event: React.MouseEvent<HTMLButtonElement>) {
        event.stopPropagation();
        onToggleSelected(pokemon.id);
    }

    return (
        <article
            className={`pokemon-card ${selected ? 'pokemon-card--selected' : ''} ${collectionVisible && !selected ? 'pokemon-card--dimmed' : ''}`}
            onMouseLeave={() => onCommitDeselection(pokemon.id)}
        >
            <button
                className="pokemon-card__select"
                type="button"
                aria-label={selected ? `Remover ${pokemon.name} da coleção` : `Adicionar ${pokemon.name} à coleção`}
                onClick={handleToggleSelected}
            >
                {selected && <Check size={23} strokeWidth={3.4} />}
            </button>

            <button
                type="button"
                className="pokemon-card__open-area"
                onClick={onOpenDetails}
                aria-label={`Abrir detalhes de ${pokemon.name}`}
            >
                <div className="pokemon-card__image-wrapper">
                    <img
                        src={pokemon.imageUrl}
                        alt={pokemon.formName ? `${pokemon.name} - ${pokemon.formName}` : pokemon.name}
                        className="pokemon-card__image"
                        loading="lazy"
                    />
                </div>

                <div className="pokemon-card__meta">
                    <span className="pokemon-card__number">
                        #{pokemon.dexNumberFormatted}
                    </span>

                    <div className="pokemon-card__types">
                        {pokemon.types.map(type => (
                            <TypeBadge key={type} type={type} />
                        ))}
                    </div>
                </div>

                <strong className="pokemon-card__name">{pokemon.name}</strong>

                <span className="pokemon-card__form">
                    {pokemon.formName || ' '}
                </span>
            </button>
        </article>
    );
}
