import { useSyncExternalStore } from 'react';

// Same breakpoint as the mobile detail layout in styles.css (@media (max-width: 640px)).
const MOBILE_QUERY = '(max-width: 640px)';

function subscribe(onChange: () => void) {
    const query = window.matchMedia(MOBILE_QUERY);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
}

function getSnapshot() {
    return window.matchMedia(MOBILE_QUERY).matches;
}

/** True on phone-sized screens, for the few layout branches CSS alone can't express. */
export function useIsMobile() {
    return useSyncExternalStore(subscribe, getSnapshot);
}
