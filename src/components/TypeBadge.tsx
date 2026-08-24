import { Star } from 'lucide-react';
import { useImageRetry } from '../hooks/useImageRetry';

const BASE = import.meta.env.BASE_URL;

interface TypeBadgeProps {
    type: string;
}

// Legendary/Mythical/Starter are pseudo-types (see PokemonTypeFilterId) with no PNG icon by
// design — skip the network fetch entirely and go straight to a dedicated fallback badge below.
const CATEGORY_TYPES = new Set(['LEGENDARY', 'MYTHICAL', 'STARTER']);

export function TypeBadge({ type }: TypeBadgeProps) {
    const typeLower = type.toLowerCase();
    const isCategory = CATEGORY_TYPES.has(type);
    const { src, failed, onError } = useImageRetry(isCategory ? '' : `${BASE}images/types/type-${typeLower}.png`);

    if (src && !failed) {
        return (
            <img
                src={src}
                alt={type}
                title={type}
                className="pokemon-type-icon"
                onError={onError}
            />
        );
    }

    if (isCategory) {
        return (
            <span className={`pokemon-type pokemon-type--${typeLower}`} title={type}>
                <Star size="60%" fill="currentColor" strokeWidth={0} />
            </span>
        );
    }

    return (
        <span className={`pokemon-type pokemon-type--${typeLower}`} title={type}>
            {type.charAt(0)}
        </span>
    );
}
