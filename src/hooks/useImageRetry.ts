import { useEffect, useRef, useState } from 'react';

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

// GitHub Pages' CDN occasionally 503s on static assets transiently — retrying after a short
// backoff resolves it without the user having to manually reload the page.
export function useImageRetry(originalSrc: string | null | undefined) {
    const [attempt, setAttempt] = useState(0);
    const [failed, setFailed] = useState(false);
    const timerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

    useEffect(() => {
        setAttempt(0);
        setFailed(false);
        return () => {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        };
    }, [originalSrc]);

    function onError() {
        if (attempt >= MAX_RETRIES) {
            setFailed(true);
            return;
        }
        const delay = RETRY_DELAYS_MS[attempt] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
        timerRef.current = window.setTimeout(() => setAttempt(a => a + 1), delay);
    }

    const src = !originalSrc || failed
        ? null
        : attempt === 0
            ? originalSrc
            : `${originalSrc}${originalSrc.includes('?') ? '&' : '?'}retry=${attempt}`;

    return { src, failed, onError };
}
