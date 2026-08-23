import { useImageRetry } from '../hooks/useImageRetry';

const BASE = import.meta.env.BASE_URL;

interface TypeBadgeProps {
    type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
    const typeLower = type.toLowerCase();
    const { src, failed, onError } = useImageRetry(`${BASE}images/types/type-${typeLower}.png`);

    return !src || failed ? (
        <span className={`pokemon-type pokemon-type--${typeLower}`} title={type}>
            {type.charAt(0)}
        </span>
    ) : (
        <img
            src={src}
            alt={type}
            title={type}
            className="pokemon-type-icon"
            onError={onError}
        />
    );
}
