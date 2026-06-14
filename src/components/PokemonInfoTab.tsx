import type { Pokemon, PokemonMoveDetail } from '../types/Pokemon';
import { TypeBadge } from './TypeBadge';

interface PokemonInfoTabProps {
    pokemon: Pokemon;
}

interface StatRow {
    label: string;
    value: number;
}

const STAT_MAX = 160;

const TYPE_EFFECTIVENESS_LABELS: Record<number, string> = {
    0: 'Immune',
    0.25: '¼×',
    0.5: '½×',
    2: '2×',
    4: '4×',
};

function formatHeight(meters: number): string {
    return `${meters.toFixed(2)} m`;
}

function formatWeight(kg: number): string {
    return `${kg.toFixed(1)} kg`;
}

function formatColor(color: string): string {
    return color.charAt(0).toUpperCase() + color.slice(1);
}

function formatGeneration(gen: number): string {
    const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
    return `Gen ${numerals[gen - 1] ?? gen}`;
}

function formatGender(maleRate: number | null | undefined, femaleRate: number | null | undefined): string {
    if (maleRate === null || maleRate === undefined) return 'Genderless';
    return `${maleRate}% ♂ / ${femaleRate}% ♀`;
}

function formatGrowthRate(raw: string): string {
    return raw.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatEggGroups(groups: string[]): string {
    return groups.map(g => g.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(', ');
}

function formatHabitat(raw: string): string {
    return raw.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatCategory(category: string | null | undefined): string {
    if (!category) return '—';
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function getStatRows(pokemon: Pokemon): StatRow[] | null {
    if (
        pokemon.hp == null &&
        pokemon.attack == null &&
        pokemon.defense == null &&
        pokemon.specialAttack == null &&
        pokemon.specialDefense == null &&
        pokemon.speed == null
    ) {
        return null;
    }

    return [
        { label: 'HP', value: pokemon.hp ?? 0 },
        { label: 'Attack', value: pokemon.attack ?? 0 },
        { label: 'Defense', value: pokemon.defense ?? 0 },
        { label: 'Sp. Atk', value: pokemon.specialAttack ?? 0 },
        { label: 'Sp. Def', value: pokemon.specialDefense ?? 0 },
        { label: 'Speed', value: pokemon.speed ?? 0 },
    ];
}

function getTotalStats(rows: StatRow[]): number {
    return rows.reduce((sum, r) => sum + r.value, 0);
}

function getStatPercentage(value: number): string {
    return `${(Math.min(value, STAT_MAX) / STAT_MAX) * 100}%`;
}

function MoveTable({ title, rows }: { title: string; rows: PokemonMoveDetail[] }) {
    return (
        <section className="pokemon-move-table-card">
            <h4>{title}</h4>
            <div className="pokemon-move-table-wrapper">
                <table className="pokemon-move-table">
                    <thead>
                    <tr>
                        <th>Lv./TM</th>
                        <th>Move</th>
                        <th>Type</th>
                        <th>Cat.</th>
                        <th>Power</th>
                        <th>Acc.</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map(row => (
                        <tr key={`${row.levelOrTm}-${row.moveSlug}`}>
                            <td>{row.levelOrTm}</td>
                            <td className="pokemon-move-table__move">{row.moveName}</td>
                            <td>
                                {row.type ? (
                                    <span className={`pokemon-move-type pokemon-move-type--${row.type.toLowerCase()}`}>
                                        {row.type}
                                    </span>
                                ) : '—'}
                            </td>
                            <td>{formatCategory(row.category)}</td>
                            <td>{row.power ?? '—'}</td>
                            <td>{row.accuracy != null ? `${row.accuracy}` : '—'}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function TypeEffectivenessSection({ typeEffectiveness }: { typeEffectiveness: Record<string, number> }) {
    const grouped: Record<number, string[]> = {};

    for (const [type, mult] of Object.entries(typeEffectiveness)) {
        if (!grouped[mult]) grouped[mult] = [];
        grouped[mult].push(type);
    }

    const orderedMultipliers = [4, 2, 0.5, 0.25, 0];

    return (
        <section className="pokemon-info-card pokemon-type-effectiveness">
            <h3>Type Effectiveness</h3>
            <div className="pokemon-type-effectiveness__groups">
                {orderedMultipliers.map(mult => {
                    const types = grouped[mult];
                    if (!types || types.length === 0) return null;
                    return (
                        <div key={mult} className="pokemon-type-effectiveness__group">
                            <span className="pokemon-type-effectiveness__label">
                                {TYPE_EFFECTIVENESS_LABELS[mult] ?? `${mult}×`}
                            </span>
                            <div className="pokemon-type-effectiveness__types">
                                {types.map(type => (
                                    <TypeBadge key={type} type={type} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export function PokemonInfoTab({ pokemon }: PokemonInfoTabProps) {
    const statRows = getStatRows(pokemon);
    const hasExtras = pokemon.height != null;
    const hasSpecies = pokemon.genus != null || (pokemon.eggGroups != null && pokemon.eggGroups.length > 0) || pokemon.growthRate != null || pokemon.habitat != null || pokemon.captureRate != null;
    const hasLearnsets = pokemon.levelUpMoves != null || pokemon.machineMoves != null;
    const hasTypeEffectiveness = pokemon.typeEffectiveness != null && Object.keys(pokemon.typeEffectiveness).length > 0;

    return (
        <div className="pokemon-info-tab">
            <section className="pokemon-info-summary-grid">
                {/* General Information */}
                <div className="pokemon-info-card">
                    <h3>General Information</h3>
                    <div className="pokemon-general-info-list">
                        {hasExtras && (
                            <>
                                <div className="pokemon-general-info-row">
                                    <span className="pokemon-general-info-row__icon">↕</span>
                                    <div>
                                        <small>Height</small>
                                        <strong>{formatHeight(pokemon.height!)}</strong>
                                    </div>
                                </div>
                                <div className="pokemon-general-info-row">
                                    <span className="pokemon-general-info-row__icon">⚖</span>
                                    <div>
                                        <small>Weight</small>
                                        <strong>{formatWeight(pokemon.weight!)}</strong>
                                    </div>
                                </div>
                                {pokemon.color && (
                                    <div className="pokemon-general-info-row">
                                        <span className="pokemon-general-info-row__icon">●</span>
                                        <div>
                                            <small>Color</small>
                                            <strong>{formatColor(pokemon.color)}</strong>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {pokemon.abilities && pokemon.abilities.length > 0 && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">✦</span>
                                <div>
                                    <small>Abilities</small>
                                    <strong>{pokemon.abilities.join(', ')}</strong>
                                </div>
                            </div>
                        )}

                        {pokemon.natures && pokemon.natures.length > 0 && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">◆</span>
                                <div>
                                    <small>Natures</small>
                                    <strong>{pokemon.natures.map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(', ')}</strong>
                                </div>
                            </div>
                        )}

                        {pokemon.region && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">⌖</span>
                                <div>
                                    <small>Region</small>
                                    <strong>{pokemon.region}</strong>
                                </div>
                            </div>
                        )}

                        {hasExtras && pokemon.generation != null && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">▦</span>
                                <div>
                                    <small>Generation</small>
                                    <strong>{formatGeneration(pokemon.generation)}</strong>
                                </div>
                            </div>
                        )}

                        {hasExtras && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">♂♀</span>
                                <div>
                                    <small>Gender Ratio</small>
                                    <strong>{formatGender(pokemon.maleRate, pokemon.femaleRate)}</strong>
                                </div>
                            </div>
                        )}

                        {!hasExtras && (
                            <p className="pokemon-info-placeholder">
                                Run <code>node scripts/generate-pokedata.mjs</code> to load real data.
                            </p>
                        )}
                    </div>
                </div>

                {/* Base Stats */}
                <div className="pokemon-info-card">
                    <h3>Base Stats</h3>
                    {statRows ? (
                        <>
                            <div className="pokemon-base-stats-list">
                                {statRows.map(stat => (
                                    <div key={stat.label} className="pokemon-base-stat-row">
                                        <div className="pokemon-base-stat-row__header">
                                            <span>{stat.label}</span>
                                            <strong>{stat.value}</strong>
                                        </div>
                                        <div className="pokemon-base-stat-row__bar">
                                            <div
                                                className="pokemon-base-stat-row__bar-fill"
                                                style={{ width: getStatPercentage(stat.value) }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <strong className="pokemon-base-stats-total">
                                Base Stats Total: {getTotalStats(statRows)}
                            </strong>
                        </>
                    ) : (
                        <p className="pokemon-info-placeholder">
                            Run <code>node scripts/generate-pokedata.mjs</code> to load stats.
                        </p>
                    )}
                </div>
            </section>

            {/* Pokédex flavor text */}
            {pokemon.flavorText && (
                <blockquote className="pokemon-flavor-text">
                    {pokemon.flavorText}
                </blockquote>
            )}

            {/* Species characteristics */}
            {hasSpecies && (
                <div className="pokemon-info-card">
                    <h3>Species</h3>
                    <div className="pokemon-general-info-list">
                        {pokemon.genus && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">✦</span>
                                <div>
                                    <small>Genus</small>
                                    <strong>{pokemon.genus}</strong>
                                </div>
                            </div>
                        )}
                        {pokemon.eggGroups && pokemon.eggGroups.length > 0 && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">○</span>
                                <div>
                                    <small>Egg Groups</small>
                                    <strong>{formatEggGroups(pokemon.eggGroups)}</strong>
                                </div>
                            </div>
                        )}
                        {pokemon.growthRate && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">↑</span>
                                <div>
                                    <small>Growth Rate</small>
                                    <strong>{formatGrowthRate(pokemon.growthRate)}</strong>
                                </div>
                            </div>
                        )}
                        {pokemon.habitat && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">◎</span>
                                <div>
                                    <small>Habitat</small>
                                    <strong>{formatHabitat(pokemon.habitat)}</strong>
                                </div>
                            </div>
                        )}
                        {pokemon.captureRate != null && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">⊙</span>
                                <div>
                                    <small>Capture Rate</small>
                                    <strong>{pokemon.captureRate}</strong>
                                </div>
                            </div>
                        )}
                        {pokemon.baseHappiness != null && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon">♡</span>
                                <div>
                                    <small>Base Happiness</small>
                                    <strong>{pokemon.baseHappiness}</strong>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Type Effectiveness */}
            {hasTypeEffectiveness && (
                <TypeEffectivenessSection typeEffectiveness={pokemon.typeEffectiveness!} />
            )}

            {/* Moves */}
            {hasLearnsets ? (
                <section className="pokemon-moves-section">
                    <header>
                        <h3>Moves learned by {pokemon.name}</h3>
                    </header>
                    <div className="pokemon-moves-grid">
                        {(pokemon.levelUpMoves?.length ?? 0) > 0 && (
                            <MoveTable title="Moves learnt by level up" rows={pokemon.levelUpMoves!} />
                        )}
                        {(pokemon.machineMoves?.length ?? 0) > 0 && (
                            <MoveTable title="Moves learnt by TM" rows={pokemon.machineMoves!} />
                        )}
                    </div>
                </section>
            ) : (
                <section className="pokemon-moves-section">
                    <p className="pokemon-info-placeholder">
                        Run <code>node scripts/generate-pokedata.mjs</code> to load move learnsets.
                    </p>
                </section>
            )}
        </div>
    );
}
