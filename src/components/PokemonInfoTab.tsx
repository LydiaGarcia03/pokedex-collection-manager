import { Egg, Hash, Heart, Leaf, MapPin, Palette, Ruler, Scale, Sparkles, Tag, Target, TrendingUp, TreePine, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Pokemon, PokemonMoveDetail } from '../types/Pokemon';
import { useIsMobile } from '../hooks/useIsMobile';
import { InfoBalloon } from './InfoBalloon';
import { TypeBadge } from './TypeBadge';

const abilityCache = new Map<string, string>();

async function fetchAbilityDescription(slug: string): Promise<string> {
    if (abilityCache.has(slug)) return abilityCache.get(slug)!;
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/ability/${slug}/`);
        const data = await res.json();
        const entry = data.effect_entries?.find(
            (e: { language: { name: string }; short_effect: string }) => e.language.name === 'en'
        );
        const desc = entry?.short_effect ?? '';
        abilityCache.set(slug, desc);
        return desc;
    } catch {
        return '';
    }
}

interface PokemonInfoTabProps {
    pokemon: Pokemon;
}

interface StatRow {
    label: string;
    value: number;
}

const STAT_MAX = 160;

const NATURE_STAT_LABELS: Record<string, string> = {
    attack: 'Attack',
    defense: 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    speed: 'Speed',
};

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

function formatAbilityName(slug: string): string {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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

// Mobile colors the stat bars by band; desktop keeps one color.
function getStatBand(value: number): 'high' | 'low' | 'mid' {
    return value >= 80 ? 'high' : value < 45 ? 'low' : 'mid';
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
                            <td className="pokemon-move-table__move">
                                <InfoBalloon label={row.moveName} content={row.shortEffect} />
                            </td>
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

type MoveListKind = 'levelUp' | 'machine';

// Mobile replacement for the two 6-column tables (which overflow a phone): one list at a time,
// switched by "Level up / TM".
function MoveList({ levelUpMoves, machineMoves }: { levelUpMoves: PokemonMoveDetail[]; machineMoves: PokemonMoveDetail[] }) {
    const [preferred, setPreferred] = useState<MoveListKind>('levelUp');
    // Fall back to whichever list exists when the preferred one is empty for this Pokémon.
    const kind: MoveListKind = preferred === 'levelUp'
        ? (levelUpMoves.length > 0 ? 'levelUp' : 'machine')
        : (machineMoves.length > 0 ? 'machine' : 'levelUp');
    const rows = kind === 'levelUp' ? levelUpMoves : machineMoves;
    const options: { id: MoveListKind; label: string; count: number }[] = [
        { id: 'levelUp', label: 'Level up', count: levelUpMoves.length },
        { id: 'machine', label: 'TM', count: machineMoves.length },
    ];

    return (
        <div className="pokemon-move-list">
            <div className="pokemon-move-list__switch" role="tablist" aria-label="Move list">
                {options.filter(option => option.count > 0).map(option => (
                    <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={kind === option.id}
                        className={`pokemon-move-list__switch-option ${kind === option.id ? 'pokemon-move-list__switch-option--active' : ''}`}
                        onClick={() => setPreferred(option.id)}
                    >
                        {option.label} ({option.count})
                    </button>
                ))}
            </div>
            <ul className="pokemon-move-list__items">
                {rows.map(row => (
                    <li key={`${row.levelOrTm}-${row.moveSlug}`} className="pokemon-move-list__item">
                        <span className="pokemon-move-list__level">{row.levelOrTm}</span>
                        <div className="pokemon-move-list__main">
                            <InfoBalloon label={row.moveName} content={row.shortEffect} />
                            <small>
                                {formatCategory(row.category)} · Power {row.power ?? '—'} · Acc. {row.accuracy ?? '—'}
                            </small>
                        </div>
                        {row.type && (
                            <span className={`pokemon-move-type pokemon-move-type--${row.type.toLowerCase()}`}>{row.type}</span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
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
    const isMobile = useIsMobile();
    const [abilityDescriptions, setAbilityDescriptions] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!pokemon.abilities?.length) return;
        setAbilityDescriptions({});
        for (const slug of pokemon.abilities) {
            fetchAbilityDescription(slug).then(desc => {
                if (desc) setAbilityDescriptions(prev => ({ ...prev, [slug]: desc }));
            });
        }
    }, [pokemon.id]);

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
                                    <span className="pokemon-general-info-row__icon"><Ruler size={16} /></span>
                                    <div>
                                        <small>Height</small>
                                        <strong>{formatHeight(pokemon.height!)}</strong>
                                    </div>
                                </div>
                                <div className="pokemon-general-info-row">
                                    <span className="pokemon-general-info-row__icon"><Scale size={16} /></span>
                                    <div>
                                        <small>Weight</small>
                                        <strong>{formatWeight(pokemon.weight!)}</strong>
                                    </div>
                                </div>
                                {pokemon.color && (
                                    <div className="pokemon-general-info-row">
                                        <span className="pokemon-general-info-row__icon"><Palette size={16} /></span>
                                        <div>
                                            <small>Color</small>
                                            <strong>{formatColor(pokemon.color)}</strong>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {pokemon.abilities && pokemon.abilities.length > 0 && (
                            <div className="pokemon-general-info-row pokemon-general-info-row--wide">
                                <span className="pokemon-general-info-row__icon"><Sparkles size={16} /></span>
                                <div>
                                    <small>Abilities</small>
                                    <strong className="pokemon-abilities-list">
                                        {pokemon.abilities.map((slug, i) => (
                                            <span key={slug}>
                                                <InfoBalloon
                                                    label={formatAbilityName(slug)}
                                                    content={abilityDescriptions[slug]}
                                                />
                                                {i < pokemon.abilities!.length - 1 ? ', ' : ''}
                                            </span>
                                        ))}
                                    </strong>
                                </div>
                            </div>
                        )}

                        {pokemon.recommendedNatures && pokemon.recommendedNatures.length > 0 && (
                            <div className="pokemon-general-info-row pokemon-general-info-row--wide">
                                <span className="pokemon-general-info-row__icon"><Leaf size={16} /></span>
                                <div>
                                    <small>Recommended Nature</small>
                                    <strong className="pokemon-recommended-natures">
                                        {pokemon.recommendedNatures.map((nature, index) => (
                                            <span key={nature.name} className="pokemon-recommended-nature">
                                                <InfoBalloon
                                                    className="pokemon-recommended-nature__name"
                                                    label={nature.name}
                                                    content={
                                                        <span className="nature-balloon">
                                                            <span className="nature-balloon__stat nature-balloon__stat--up">
                                                                {NATURE_STAT_LABELS[nature.increasedStat]} ++
                                                            </span>
                                                            <span className="nature-balloon__stat nature-balloon__stat--down">
                                                                {NATURE_STAT_LABELS[nature.decreasedStat]} --
                                                            </span>
                                                        </span>
                                                    }
                                                />
                                                {index < pokemon.recommendedNatures!.length - 1 ? ', ' : ''}
                                            </span>
                                        ))}
                                    </strong>
                                </div>
                            </div>
                        )}

                        {pokemon.region && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon"><MapPin size={16} /></span>
                                <div>
                                    <small>Region</small>
                                    <strong>{pokemon.region}</strong>
                                </div>
                            </div>
                        )}

                        {hasExtras && pokemon.generation != null && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon"><Hash size={16} /></span>
                                <div>
                                    <small>Generation</small>
                                    <strong>{formatGeneration(pokemon.generation)}</strong>
                                </div>
                            </div>
                        )}

                        {hasExtras && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon"><Users size={16} /></span>
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
                                                className={`pokemon-base-stat-row__bar-fill pokemon-base-stat-row__bar-fill--${getStatBand(stat.value)}`}
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
                                <span className="pokemon-general-info-row__icon"><Tag size={16} /></span>
                                <div>
                                    <small>Genus</small>
                                    <strong>{pokemon.genus}</strong>
                                </div>
                            </div>
                        )}
                        {pokemon.eggGroups && pokemon.eggGroups.length > 0 && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon"><Egg size={16} /></span>
                                <div>
                                    <small>Egg Groups</small>
                                    <strong>{formatEggGroups(pokemon.eggGroups)}</strong>
                                </div>
                            </div>
                        )}
                        {pokemon.growthRate && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon"><TrendingUp size={16} /></span>
                                <div>
                                    <small>Growth Rate</small>
                                    <strong>{formatGrowthRate(pokemon.growthRate)}</strong>
                                </div>
                            </div>
                        )}
                        {pokemon.habitat && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon"><TreePine size={16} /></span>
                                <div>
                                    <small>Habitat</small>
                                    <strong>{formatHabitat(pokemon.habitat)}</strong>
                                </div>
                            </div>
                        )}
                        {pokemon.captureRate != null && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon"><Target size={16} /></span>
                                <div>
                                    <small>Capture Rate</small>
                                    <strong>{pokemon.captureRate}</strong>
                                </div>
                            </div>
                        )}
                        {pokemon.baseHappiness != null && (
                            <div className="pokemon-general-info-row">
                                <span className="pokemon-general-info-row__icon"><Heart size={16} /></span>
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
                    {isMobile ? (
                        <MoveList levelUpMoves={pokemon.levelUpMoves ?? []} machineMoves={pokemon.machineMoves ?? []} />
                    ) : (
                        <div className="pokemon-moves-grid">
                            {(pokemon.levelUpMoves?.length ?? 0) > 0 && (
                                <MoveTable title="Moves learnt by level up" rows={pokemon.levelUpMoves!} />
                            )}
                            {(pokemon.machineMoves?.length ?? 0) > 0 && (
                                <MoveTable title="Moves learnt by TM" rows={pokemon.machineMoves!} />
                            )}
                        </div>
                    )}
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
