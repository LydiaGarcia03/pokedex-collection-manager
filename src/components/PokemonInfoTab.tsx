import { Egg, Hash, Heart, Leaf, MapPin, Palette, Ruler, Scale, Sparkles, Tag, Target, TrendingUp, TreePine, Users } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { loadPokemonMoves } from '../api/pokemonApi';
import type { Pokemon, PokemonMoveDetail, PokemonMoves, RecommendedNature } from '../types/Pokemon';
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

// Stat bars are colored by band (low / mid / high) on both layouts.
function getStatBand(value: number): 'high' | 'low' | 'mid' {
    return value >= 80 ? 'high' : value < 45 ? 'low' : 'mid';
}

function getStatPercentage(value: number): string {
    return `${(Math.min(value, STAT_MAX) / STAT_MAX) * 100}%`;
}

type MoveListKind = 'levelUp' | 'machine';

// Mobile move list: one list at a time, switched by "Level up / TM" (desktop shows both side by
// side, see DesktopMoveTable).
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

function AbilityList({ abilities, descriptions }: { abilities: string[]; descriptions: Record<string, string> }) {
    return (
        <strong className="pokemon-abilities-list">
            {abilities.map((slug, i) => (
                <span key={slug}>
                    <InfoBalloon label={formatAbilityName(slug)} content={descriptions[slug]} />
                    {i < abilities.length - 1 ? ', ' : ''}
                </span>
            ))}
        </strong>
    );
}

function NatureList({ natures }: { natures: RecommendedNature[] }) {
    return (
        <strong className="pokemon-recommended-natures">
            {natures.map((nature, index) => (
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
                    {index < natures.length - 1 ? ', ' : ''}
                </span>
            ))}
        </strong>
    );
}

/* ─── Desktop layout (option I1 of docs/desktop-detail-d-mock.html) ─────────────────────── */

const MULTIPLIER_LABELS: Record<number, string> = { 4: '4×', 2: '2×', 0.5: '½×', 0.25: '¼×', 0: '0×' };

const DESKTOP_SECTIONS = [
    { id: 'about', label: 'About' },
    { id: 'stats', label: 'Stats' },
    { id: 'species', label: 'Species' },
    { id: 'moves', label: 'Moves' },
] as const;

type DesktopSectionId = typeof DESKTOP_SECTIONS[number]['id'];

function getScrollParent(element: HTMLElement | null): HTMLElement | null {
    for (let node = element?.parentElement ?? null; node; node = node.parentElement) {
        const { overflowY } = getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll') return node;
    }
    return null;
}

function getSectionElement(sectionIdPrefix: string, id: DesktopSectionId): HTMLElement | null {
    return document.getElementById(`${sectionIdPrefix}-${id}`);
}

/** Sticky shortcuts (About · Stats · Species · Moves) that jump to a section and follow the scroll. */
function SectionShortcuts({ sectionIdPrefix }: { sectionIdPrefix: string }) {
    const navRef = useRef<HTMLElement>(null);
    const [active, setActive] = useState<DesktopSectionId>('about');

    useEffect(() => {
        const nav = navRef.current;
        const container = getScrollParent(nav);
        if (!nav || !container) return;
        function updateActive() {
            const limit = container!.getBoundingClientRect().top + nav!.offsetHeight + 40;
            const atBottom = container!.scrollTop + container!.clientHeight >= container!.scrollHeight - 4;
            let current: DesktopSectionId = 'about';
            for (const { id } of DESKTOP_SECTIONS) {
                const element = getSectionElement(sectionIdPrefix, id);
                if (element && (element.getBoundingClientRect().top <= limit || (atBottom && id === 'moves'))) current = id;
            }
            setActive(current);
        }
        updateActive();
        container.addEventListener('scroll', updateActive, { passive: true });
        return () => container.removeEventListener('scroll', updateActive);
    }, [sectionIdPrefix]);

    function jumpTo(id: DesktopSectionId) {
        const nav = navRef.current;
        const container = getScrollParent(nav);
        const element = getSectionElement(sectionIdPrefix, id);
        if (!nav || !container || !element) return;
        const offset = element.getBoundingClientRect().top - container.getBoundingClientRect().top;
        container.scrollTo({ top: container.scrollTop + offset - nav.offsetHeight - 8, behavior: 'smooth' });
    }

    return (
        <nav ref={navRef} className="pokemon-info-desktop__shortcuts" aria-label="Sections">
            {DESKTOP_SECTIONS.map(({ id, label }) => (
                <button
                    key={id}
                    type="button"
                    className={`pokemon-info-desktop__shortcut ${active === id ? 'pokemon-info-desktop__shortcut--active' : ''}`}
                    aria-current={active === id ? 'true' : undefined}
                    onClick={() => jumpTo(id)}
                >
                    {label}
                </button>
            ))}
        </nav>
    );
}

function Tile({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
    return (
        <div className={`pokemon-info-desktop__tile ${wide ? 'pokemon-info-desktop__tile--wide' : ''}`}>
            <span>{label}</span>
            <strong>{children}</strong>
        </div>
    );
}

function EffectivenessRow({ label, entries, tone }: { label: string; entries: [string, number][]; tone: 'weak' | 'resist' | 'immune' }) {
    if (entries.length === 0) return null;
    return (
        <div className="pokemon-info-desktop__effectiveness-row">
            <span className="pokemon-info-desktop__effectiveness-label">{label}</span>
            <div className="pokemon-info-desktop__effectiveness-chips">
                {entries.map(([type, multiplier]) => (
                    <span key={type} className={`pokemon-info-desktop__effectiveness-chip pokemon-info-desktop__effectiveness-chip--${tone}`}>
                        <TypeBadge type={type} />
                        {MULTIPLIER_LABELS[multiplier] ?? `${multiplier}×`}
                    </span>
                ))}
            </div>
        </div>
    );
}

function DesktopMoveTable({ title, firstColumn, rows }: { title: string; firstColumn: string; rows: PokemonMoveDetail[] }) {
    return (
        <div className="pokemon-info-desktop__moves-column">
            <h4>{title} · {rows.length}</h4>
            <table className="pokemon-info-desktop__move-table">
                <thead>
                <tr>
                    <th>{firstColumn}</th>
                    <th>Move</th>
                    <th aria-label="Type" />
                    <th>Category</th>
                    <th className="pokemon-info-desktop__number">Power</th>
                    <th className="pokemon-info-desktop__number">Acc.</th>
                </tr>
                </thead>
                <tbody>
                {rows.map(row => (
                    <tr key={`${row.levelOrTm}-${row.moveSlug}`}>
                        <td className="pokemon-info-desktop__move-level">{row.levelOrTm}</td>
                        <td className="pokemon-info-desktop__move-name">
                            <InfoBalloon label={row.moveName} content={row.shortEffect} />
                        </td>
                        <td>{row.type && <TypeBadge type={row.type} />}</td>
                        <td>
                            {row.category && (
                                <span className={`pokemon-info-desktop__category pokemon-info-desktop__category--${row.category}`}>
                                    {row.category}
                                </span>
                            )}
                        </td>
                        <td className="pokemon-info-desktop__number">{row.power ?? '—'}</td>
                        <td className="pokemon-info-desktop__number">{row.accuracy != null ? `${row.accuracy}%` : '—'}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

interface DesktopInfoProps {
    pokemon: Pokemon;
    abilityDescriptions: Record<string, string>;
    moves: { levelUp: PokemonMoveDetail[] | null | undefined; machine: PokemonMoveDetail[] | null | undefined; status: 'loading' | 'failed' | 'ready' };
}

function PokemonInfoDesktop({ pokemon, abilityDescriptions, moves }: DesktopInfoProps) {
    const sectionIdPrefix = `pokemon-info-${pokemon.id}`;
    const statRows = getStatRows(pokemon);
    const effectiveness = Object.entries(pokemon.typeEffectiveness ?? {}).sort(([, a], [, b]) => b - a);
    const hasLearnsets = moves.levelUp != null || moves.machine != null;

    return (
        <div className="pokemon-info-desktop">
            <SectionShortcuts key={pokemon.id} sectionIdPrefix={sectionIdPrefix} />

            <section id={`${sectionIdPrefix}-about`} className="pokemon-info-desktop__section">
                <h3>About</h3>
                {pokemon.flavorText && <p className="pokemon-info-desktop__flavor">{pokemon.flavorText}</p>}
                {pokemon.height != null ? (
                    <div className="pokemon-info-desktop__tiles pokemon-info-desktop__tiles--five">
                        <Tile label="Height">{formatHeight(pokemon.height)}</Tile>
                        <Tile label="Weight">{formatWeight(pokemon.weight!)}</Tile>
                        {pokemon.generation != null && <Tile label="Generation">{formatGeneration(pokemon.generation)}</Tile>}
                        {pokemon.region && <Tile label="Region">{pokemon.region}</Tile>}
                        {pokemon.color && <Tile label="Color">{formatColor(pokemon.color)}</Tile>}
                    </div>
                ) : (
                    <p className="pokemon-info-placeholder">
                        Run <code>node scripts/generate-pokedata.mjs</code> to load real data.
                    </p>
                )}
            </section>

            <div id={`${sectionIdPrefix}-stats`} className="pokemon-info-desktop__stack">
                {/* Base Stats and Abilities & Nature end on the same line: the latter stretches. */}
                <div className="pokemon-info-desktop__pair">
                    <section className="pokemon-info-desktop__section">
                        <h3>Base Stats</h3>
                        {statRows ? (
                            <>
                                {statRows.map(stat => (
                                    <div key={stat.label} className="pokemon-info-desktop__stat">
                                        <span>{stat.label}</span>
                                        <strong>{stat.value}</strong>
                                        <div className="pokemon-info-desktop__stat-bar">
                                            <div
                                                className={`pokemon-info-desktop__stat-fill pokemon-info-desktop__stat-fill--${getStatBand(stat.value)}`}
                                                style={{ width: getStatPercentage(stat.value) }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <div className="pokemon-info-desktop__stat-total">Total <strong>{getTotalStats(statRows)}</strong></div>
                            </>
                        ) : (
                            <p className="pokemon-info-placeholder">
                                Run <code>node scripts/generate-pokedata.mjs</code> to load stats.
                            </p>
                        )}
                    </section>

                    <section className="pokemon-info-desktop__section pokemon-info-desktop__section--fill">
                        <h3>Abilities &amp; Nature</h3>
                        <div className="pokemon-info-desktop__tiles pokemon-info-desktop__tiles--stretch">
                            {pokemon.abilities && pokemon.abilities.length > 0 && (
                                <Tile label="Abilities">
                                    <AbilityList abilities={pokemon.abilities} descriptions={abilityDescriptions} />
                                </Tile>
                            )}
                            {pokemon.recommendedNatures && pokemon.recommendedNatures.length > 0 && (
                                <Tile label="Recommended nature">
                                    <NatureList natures={pokemon.recommendedNatures} />
                                </Tile>
                            )}
                        </div>
                    </section>
                </div>

                {effectiveness.length > 0 && (
                    <section className="pokemon-info-desktop__section">
                        <h3>Type Effectiveness</h3>
                        <EffectivenessRow label="Weak to" tone="weak" entries={effectiveness.filter(([, m]) => m > 1)} />
                        <EffectivenessRow label="Resists" tone="resist" entries={effectiveness.filter(([, m]) => m > 0 && m < 1)} />
                        <EffectivenessRow label="Immune to" tone="immune" entries={effectiveness.filter(([, m]) => m === 0)} />
                    </section>
                )}
            </div>

            <section id={`${sectionIdPrefix}-species`} className="pokemon-info-desktop__section">
                <h3>Species</h3>
                <div className="pokemon-info-desktop__tiles pokemon-info-desktop__tiles--four">
                    {pokemon.height != null && <Tile label="Gender" wide>{formatGender(pokemon.maleRate, pokemon.femaleRate)}</Tile>}
                    {pokemon.genus && <Tile label="Genus">{pokemon.genus}</Tile>}
                    {pokemon.eggGroups && pokemon.eggGroups.length > 0 && <Tile label="Egg groups">{formatEggGroups(pokemon.eggGroups)}</Tile>}
                    {pokemon.growthRate && <Tile label="Growth rate">{formatGrowthRate(pokemon.growthRate)}</Tile>}
                    {pokemon.habitat && <Tile label="Habitat">{formatHabitat(pokemon.habitat)}</Tile>}
                    {pokemon.captureRate != null && <Tile label="Capture rate">{pokemon.captureRate}</Tile>}
                    {pokemon.baseHappiness != null && <Tile label="Base happiness">{pokemon.baseHappiness}</Tile>}
                </div>
            </section>

            <section id={`${sectionIdPrefix}-moves`} className="pokemon-info-desktop__section">
                <h3>Moves learned by {pokemon.name}</h3>
                {hasLearnsets ? (
                    <div className="pokemon-info-desktop__moves">
                        {moves.levelUp && moves.levelUp.length > 0 && (
                            <DesktopMoveTable title="Level up" firstColumn="Lv." rows={moves.levelUp} />
                        )}
                        {moves.machine && moves.machine.length > 0 && (
                            <DesktopMoveTable title="TM" firstColumn="TM" rows={moves.machine} />
                        )}
                    </div>
                ) : (
                    <p className="pokemon-info-placeholder" role="status">
                        {moves.status === 'loading' && 'Loading moves…'}
                        {moves.status === 'failed' && 'Could not load moves. Reopen this Pokémon to try again.'}
                        {moves.status === 'ready' && <>Run <code>node scripts/generate-pokedata.mjs</code> to load move learnsets.</>}
                    </p>
                )}
            </section>
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
    // Tagged with the Pokémon id so a slow response never shows another Pokémon's moves.
    const [movesState, setMovesState] = useState<{ pokemonId: string; moves: PokemonMoves | null; failed: boolean } | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadPokemonMoves(pokemon.id)
            .then(moves => { if (!cancelled) setMovesState({ pokemonId: pokemon.id, moves, failed: false }); })
            .catch(() => { if (!cancelled) setMovesState({ pokemonId: pokemon.id, moves: null, failed: true }); });
        return () => { cancelled = true; };
    }, [pokemon.id]);

    const currentMoves = movesState?.pokemonId === pokemon.id ? movesState : null;
    const levelUpMoves = currentMoves?.moves?.levelUpMoves;
    const machineMoves = currentMoves?.moves?.machineMoves;

    useEffect(() => {
        if (!pokemon.abilities?.length) return;
        setAbilityDescriptions({});
        for (const slug of pokemon.abilities) {
            fetchAbilityDescription(slug).then(desc => {
                if (desc) setAbilityDescriptions(prev => ({ ...prev, [slug]: desc }));
            });
        }
    }, [pokemon.id]);

    if (!isMobile) {
        return (
            <PokemonInfoDesktop
                pokemon={pokemon}
                abilityDescriptions={abilityDescriptions}
                moves={{
                    levelUp: levelUpMoves,
                    machine: machineMoves,
                    status: !currentMoves ? 'loading' : currentMoves.failed ? 'failed' : 'ready',
                }}
            />
        );
    }

    const statRows = getStatRows(pokemon);
    const hasExtras = pokemon.height != null;
    const hasSpecies = pokemon.genus != null || (pokemon.eggGroups != null && pokemon.eggGroups.length > 0) || pokemon.growthRate != null || pokemon.habitat != null || pokemon.captureRate != null;
    const hasLearnsets = levelUpMoves != null || machineMoves != null;
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
                                    <AbilityList abilities={pokemon.abilities} descriptions={abilityDescriptions} />
                                </div>
                            </div>
                        )}

                        {pokemon.recommendedNatures && pokemon.recommendedNatures.length > 0 && (
                            <div className="pokemon-general-info-row pokemon-general-info-row--wide">
                                <span className="pokemon-general-info-row__icon"><Leaf size={16} /></span>
                                <div>
                                    <small>Recommended Nature</small>
                                    <NatureList natures={pokemon.recommendedNatures} />
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
                    <MoveList levelUpMoves={levelUpMoves ?? []} machineMoves={machineMoves ?? []} />
                </section>
            ) : !currentMoves || currentMoves.failed ? (
                <section className="pokemon-moves-section">
                    <header>
                        <h3>Moves learned by {pokemon.name}</h3>
                    </header>
                    <p className="pokemon-info-placeholder" role="status">
                        {currentMoves?.failed ? 'Could not load moves. Reopen this Pokémon to try again.' : 'Loading moves…'}
                    </p>
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
