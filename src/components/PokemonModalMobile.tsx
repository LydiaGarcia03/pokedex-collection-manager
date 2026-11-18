import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Gamepad2, IdCard, Info, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import type { PokemonSummary } from '../types/Pokemon';
import type { PokemonDetailTab } from './PokemonModal';
import { TypeBadge } from './TypeBadge';

// Swipe tuning: commit after a quarter of the screen, or a quick flick.
const AXIS_LOCK_PX = 8;
const COMMIT_FRACTION = 0.25;
const FLICK_MIN_PX = 30;
const FLICK_MIN_SPEED = 0.45; // px per ms
const EDGE_RESISTANCE = 0.25; // how far the page follows the finger when there is no neighbor
const SLIDE_MAX_MS = 280; // a full-width slide; shorter when the finger already dragged part of the way
const SLIDE_MIN_MS = 110;
const SNAP_BACK_MS = 200;

type SwipeDirection = 1 | -1; // 1 = next, -1 = previous

interface SwipeNavigation {
    canGo: (direction: SwipeDirection) => boolean;
    go: (direction: SwipeDirection) => void;
}

/**
 * Horizontal swipe between Pokémon, carousel-style: the pager (current page + the neighbors'
 * headers parked on each side, see NeighborPeek) follows the finger; on release it finishes the
 * slide so the neighbor sits exactly where the page was, and only then the Pokémon switches — so
 * there is never an empty gap. Native listeners (React's touch listeners are passive)
 * so vertical scrolling can be held off once the gesture is clearly horizontal. Works at any
 * scroll position because it reads the gesture's own direction. Returns a function that plays the
 * same animation for the prev/next buttons.
 */
function usePageSwipe(rootRef: RefObject<HTMLElement | null>, pageRef: RefObject<HTMLElement | null>, navigation: SwipeNavigation) {
    const navigationRef = useRef(navigation);
    const slideRef = useRef<(direction: SwipeDirection) => void>(() => {});

    useEffect(() => {
        navigationRef.current = navigation;
    });

    useEffect(() => {
        const root = rootRef.current;
        const page = pageRef.current;
        if (!root || !page) return;

        let start: { x: number; y: number; time: number } | null = null;
        let axis: 'x' | 'y' | null = null;
        let offset = 0;
        let animating = false;

        const setOffset = (px: number, transitionMs = 0) => {
            offset = px;
            page.style.transition = transitionMs ? `transform ${transitionMs}ms ease-out` : 'none';
            page.style.transform = `translateX(${px}px)`;
        };
        // No transform at rest: a transformed ancestor would break the position: fixed card viewer.
        const clearOffset = () => {
            page.style.transition = '';
            page.style.transform = '';
        };

        const slide = (direction: SwipeDirection) => {
            if (animating || !navigationRef.current.canGo(direction)) return;
            animating = true;
            const width = root.clientWidth;
            const target = -direction * width;
            const duration = Math.max(SLIDE_MIN_MS, Math.round((Math.abs(target - offset) / width) * SLIDE_MAX_MS));
            setOffset(target, duration);
            window.setTimeout(() => {
                // The neighbor's header now fills the screen. Render the real page for that Pokémon
                // synchronously, then drop the transform in the same frame: the swap is invisible.
                flushSync(() => navigationRef.current.go(direction));
                clearOffset();
                offset = 0;
                animating = false;
            }, duration);
        };
        slideRef.current = slide;

        const snapBack = () => {
            animating = true;
            setOffset(0, SNAP_BACK_MS);
            window.setTimeout(() => {
                clearOffset();
                animating = false;
            }, SNAP_BACK_MS);
        };

        const onTouchStart = (event: TouchEvent) => {
            const target = event.target as HTMLElement;
            // Text fields, the scrolling filter chips and the enlarged TCG card keep their own gestures.
            if (animating || event.touches.length > 1 || target.closest('input, textarea, [data-no-pokemon-swipe]')) {
                start = null;
                return;
            }
            const touch = event.touches[0];
            start = { x: touch.clientX, y: touch.clientY, time: event.timeStamp };
            axis = null;
        };

        const onTouchMove = (event: TouchEvent) => {
            if (!start) return;
            const touch = event.touches[0];
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (!axis) {
                if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
                axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
                if (axis === 'y') {
                    start = null; // a normal vertical scroll
                    return;
                }
            }
            event.preventDefault(); // horizontal gesture: keep the page from also scrolling vertically
            const direction: SwipeDirection = dx < 0 ? 1 : -1;
            setOffset(navigationRef.current.canGo(direction) ? dx : dx * EDGE_RESISTANCE);
        };

        const onTouchEnd = (event: TouchEvent) => {
            if (!start || axis !== 'x') {
                start = null;
                return;
            }
            const elapsed = Math.max(1, event.timeStamp - start.time);
            start = null;
            const direction: SwipeDirection = offset < 0 ? 1 : -1;
            const isFlick = Math.abs(offset) >= FLICK_MIN_PX && Math.abs(offset) / elapsed >= FLICK_MIN_SPEED;
            const farEnough = Math.abs(offset) >= root.clientWidth * COMMIT_FRACTION;
            if ((farEnough || isFlick) && navigationRef.current.canGo(direction)) {
                slide(direction);
            } else {
                snapBack();
            }
        };

        const onTouchCancel = () => {
            if (start && axis === 'x') snapBack();
            start = null;
        };

        root.addEventListener('touchstart', onTouchStart, { passive: true });
        root.addEventListener('touchmove', onTouchMove, { passive: false });
        root.addEventListener('touchend', onTouchEnd);
        root.addEventListener('touchcancel', onTouchCancel);
        return () => {
            root.removeEventListener('touchstart', onTouchStart);
            root.removeEventListener('touchmove', onTouchMove);
            root.removeEventListener('touchend', onTouchEnd);
            root.removeEventListener('touchcancel', onTouchCancel);
            clearOffset();
        };
    }, [rootRef, pageRef]);

    return (direction: SwipeDirection) => slideRef.current(direction);
}

const TABS: { id: PokemonDetailTab; label: string; icon: ReactNode }[] = [
    { id: 'info', label: 'Info', icon: <Info size={22} /> },
    { id: 'games', label: 'Games', icon: <Gamepad2 size={22} /> },
    { id: 'tcg', label: 'TCG', icon: <IdCard size={22} /> },
];

const typeColorStyle = (summary: PokemonSummary) =>
    ({ '--type-color': `var(--type-${summary.types[0]?.toLowerCase() ?? 'normal'})` }) as CSSProperties;

const neighborImage = (summary: PokemonSummary) => summary.imageUrlXl ?? summary.imageUrl;

function HeroIdentity({ summary, imageSrc, imageAlt, onImageError }: {
    summary: PokemonSummary;
    imageSrc: string | null;
    imageAlt: string;
    onImageError?: () => void;
}) {
    return (
        <div className="pokemon-detail-mobile__identity">
            <div className="pokemon-detail-mobile__identity-text">
                <span className="pokemon-detail-mobile__dex">#{summary.dexNumberFormatted}</span>
                <strong className="pokemon-detail-mobile__name">{summary.name}</strong>
                {summary.formName && <span className="pokemon-detail-mobile__form">{summary.formName}</span>}
                <div className="pokemon-detail-mobile__types">
                    {summary.types.map(type => <TypeBadge key={type} type={type} />)}
                </div>
            </div>
            {imageSrc && (
                <img src={imageSrc} alt={imageAlt} className="pokemon-detail-mobile__image" onError={onImageError} />
            )}
        </div>
    );
}

// Look-alike of a neighbor's header, parked just off-screen beside the page. It slides in with
// the page during a swipe (no empty gap) and, being mounted, preloads the neighbor's image.
function NeighborPeek({ summary, side, selected, collectionVisible }: {
    summary: PokemonSummary;
    side: 'previous' | 'next';
    selected: boolean;
    collectionVisible: boolean;
}) {
    return (
        <div className={`pokemon-detail-mobile__peek pokemon-detail-mobile__peek--${side}`} style={typeColorStyle(summary)} aria-hidden="true">
            <div className="pokemon-detail-mobile__hero">
                <div className="pokemon-detail-mobile__hero-actions">
                    <span className="pokemon-detail-mobile__icon-button"><X size={18} strokeWidth={2.6} /></span>
                    <span className="pokemon-detail-mobile__spacer" />
                    <span className="pokemon-detail-mobile__icon-button"><Sparkles size={17} /></span>
                    <span className={`pokemon-detail-mobile__icon-button ${collectionVisible ? 'pokemon-detail-mobile__icon-button--active' : ''}`}>
                        {collectionVisible ? <Eye size={17} /> : <EyeOff size={17} />}
                    </span>
                    <span className={`pokemon-detail-modal__select pokemon-detail-mobile__select ${selected ? 'pokemon-detail-modal__select--selected' : ''}`}>
                        {selected && <Check size={24} strokeWidth={3.4} />}
                    </span>
                </div>
                <HeroIdentity summary={summary} imageSrc={neighborImage(summary)} imageAlt="" />
            </div>
            <div className="pokemon-detail-mobile__nav"><span>swipe to switch</span></div>
        </div>
    );
}

interface PokemonModalMobileProps {
    summary: PokemonSummary;
    imageSrc: string | null;
    imageAlt: string;
    onImageError: () => void;
    previousSummary: PokemonSummary | null;
    nextSummary: PokemonSummary | null;
    isPokemonSelected: (pokemonId: string) => boolean;
    onPrevious: () => void;
    onNext: () => void;
    onClose: () => void;
    selected: boolean;
    onToggleSelected: () => void;
    collectionVisible: boolean;
    onToggleCollectionVisible: () => void;
    showShiny: boolean;
    onToggleShiny: () => void;
    activeTab: PokemonDetailTab;
    onChangeTab: (tab: PokemonDetailTab) => void;
    externalLinks: ReactNode;
    children: ReactNode;
}

/**
 * Phone layout of the Pokémon detail (≤640px): full-screen, header tinted with the first type's
 * color, a compact bar that slides in once the header scrolls away, tabs in a bottom bar, and a
 * horizontal swipe anywhere on the screen to move to the previous/next Pokémon.
 * PokemonModal owns all the state and logic; this only lays it out.
 */
export function PokemonModalMobile({
    summary,
    imageSrc,
    imageAlt,
    onImageError,
    previousSummary,
    nextSummary,
    isPokemonSelected,
    onPrevious,
    onNext,
    onClose,
    selected,
    onToggleSelected,
    collectionVisible,
    onToggleCollectionVisible,
    showShiny,
    onToggleShiny,
    activeTab,
    onChangeTab,
    externalLinks,
    children,
}: PokemonModalMobileProps) {
    const rootRef = useRef<HTMLElement>(null);
    const pagerRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLElement>(null);
    const [heroInView, setHeroInView] = useState(true);

    const slideTo = usePageSwipe(rootRef, pagerRef, {
        canGo: direction => (direction === 1 ? nextSummary !== null : previousSummary !== null),
        go: direction => {
            // Match the peek, which shows the neighbor's header at the top.
            scrollRef.current?.scrollTo({ top: 0 });
            if (direction === 1) onNext(); else onPrevious();
        },
    });

    // Show the compact bar only once the big header has scrolled out of view.
    useEffect(() => {
        const hero = heroRef.current;
        const root = scrollRef.current;
        if (!hero || !root) return;
        const observer = new IntersectionObserver(([entry]) => setHeroInView(entry.isIntersecting), { root });
        observer.observe(hero);
        return () => observer.disconnect();
    }, []);

    // Newer Chrome on Android paints the area behind the system navigation bar with the page
    // background, so while the detail is open the page background takes the tab bar color.
    useEffect(() => {
        const rootElement = document.documentElement;
        rootElement.classList.add('pokemon-detail-mobile-open');
        return () => rootElement.classList.remove('pokemon-detail-mobile-open');
    }, []);

    // A new Pokémon (or tab) starts at the top.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [summary.id, activeTab]);

    const actions = (
        <>
            <button
                type="button"
                className={`pokemon-detail-mobile__icon-button ${showShiny ? 'pokemon-detail-mobile__icon-button--shiny' : ''}`}
                onClick={onToggleShiny}
                aria-pressed={showShiny}
                title={showShiny ? 'Show regular' : 'Show shiny'}
            >
                <Sparkles size={17} />
            </button>
            <button
                type="button"
                className={`pokemon-detail-mobile__icon-button ${collectionVisible ? 'pokemon-detail-mobile__icon-button--active' : ''}`}
                onClick={onToggleCollectionVisible}
                aria-pressed={collectionVisible}
                title="Visibility"
            >
                {collectionVisible ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
            <button
                type="button"
                className={`pokemon-detail-modal__select pokemon-detail-mobile__select ${selected ? 'pokemon-detail-modal__select--selected' : ''}`}
                onClick={onToggleSelected}
                aria-label={selected ? `Remove ${summary.name} from collection` : `Add ${summary.name} to collection`}
            >
                {selected && <Check size={24} strokeWidth={3.4} />}
            </button>
        </>
    );

    const closeButton = (
        <button type="button" className="pokemon-detail-mobile__icon-button" onClick={onClose} aria-label="Close">
            <X size={18} strokeWidth={2.6} />
        </button>
    );

    return (
        <section
            className="pokemon-detail-mobile"
            role="dialog"
            aria-modal="true"
            aria-label={`Details of ${summary.name}`}
            style={typeColorStyle(summary)}
            ref={rootRef}
        >
            <div className={`pokemon-detail-mobile__compact ${heroInView ? '' : 'pokemon-detail-mobile__compact--visible'}`} aria-hidden={heroInView}>
                {closeButton}
                {imageSrc && <img src={imageSrc} alt="" className="pokemon-detail-mobile__compact-image" />}
                <div className="pokemon-detail-mobile__compact-name">
                    <span>#{summary.dexNumberFormatted}</span>
                    <strong>{summary.name}</strong>
                </div>
                {actions}
            </div>

            <div className="pokemon-detail-mobile__pager" ref={pagerRef}>
                {previousSummary && (
                    <NeighborPeek summary={previousSummary} side="previous" selected={isPokemonSelected(previousSummary.id)} collectionVisible={collectionVisible} />
                )}

                <div className="pokemon-detail-mobile__scroll" ref={scrollRef}>
                    <header className="pokemon-detail-mobile__hero" ref={heroRef}>
                        <div className="pokemon-detail-mobile__hero-actions">
                            {closeButton}
                            <span className="pokemon-detail-mobile__spacer" />
                            {actions}
                        </div>

                        <HeroIdentity summary={summary} imageSrc={imageSrc} imageAlt={imageAlt} onImageError={onImageError} />
                    </header>

                    <nav className="pokemon-detail-mobile__nav" aria-label="Previous and next Pokémon">
                        <button type="button" onClick={() => slideTo(-1)} disabled={!previousSummary} aria-label="Previous Pokémon">
                            <ChevronLeft size={16} />
                            {previousSummary?.dexNumberFormatted}
                        </button>
                        <span>swipe to switch</span>
                        <button type="button" onClick={() => slideTo(1)} disabled={!nextSummary} aria-label="Next Pokémon">
                            {nextSummary?.dexNumberFormatted}
                            <ChevronRight size={16} />
                        </button>
                    </nav>

                    <div className="pokemon-detail-mobile__content">
                        {children}
                        {activeTab === 'info' && <footer className="pokemon-detail-mobile__links">{externalLinks}</footer>}
                    </div>
                </div>

                {nextSummary && (
                    <NeighborPeek summary={nextSummary} side="next" selected={isPokemonSelected(nextSummary.id)} collectionVisible={collectionVisible} />
                )}
            </div>

            <nav className="pokemon-detail-mobile__tabbar" aria-label="Detail tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className={`pokemon-detail-mobile__tab ${activeTab === tab.id ? 'pokemon-detail-mobile__tab--active' : ''}`}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                        onClick={() => onChangeTab(tab.id)}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </nav>
        </section>
    );
}
