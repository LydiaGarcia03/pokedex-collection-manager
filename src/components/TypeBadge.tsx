import { useState } from 'react';

const BASE = import.meta.env.BASE_URL;

interface TypeBadgeProps {
    type: string;
}

export function TypeBadge({ type }: TypeBadgeProps) {
    const [imgFailed, setImgFailed] = useState(false);
    const typeLower = type.toLowerCase();

    return imgFailed ? (
        <span className={`pokemon-type pokemon-type--${typeLower}`} title={type}>
            {type.charAt(0)}
        </span>
    ) : (
        <img
            src={`${BASE}images/types/type-${typeLower}.png`}
            alt={type}
            title={type}
            className="pokemon-type-icon"
            onError={() => setImgFailed(true)}
        />
    );
}
