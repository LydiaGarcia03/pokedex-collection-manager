// "Foil" action icon: one big and two small sparkles (option F1 of docs/foil-icon-mock.html).
// Used where a card gets marked or filtered as foil; a foil card itself shows the word FOIL.
export function FoilSparklesIcon({ size = 16 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M10 3l1.7 5.1L17 10l-5.3 1.9L10 17l-1.7-5.1L3 10l5.3-1.9z" />
            <path d="M18.5 13l.8 2.3 2.2.7-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.7z" />
            <path d="M18 2.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" />
        </svg>
    );
}
