import { type User, onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../firebase/auth';

// Firebase takes a moment to restore the session on startup. Remembering who was logged in lets
// the header show the right button right away instead of flashing "Login" first.
const LAST_USER_NAME_KEY = 'pcm.lastUserName';

function readLastUserName(): string | null {
    try {
        return localStorage.getItem(LAST_USER_NAME_KEY);
    } catch {
        return null;
    }
}

function rememberUserName(name: string | null) {
    try {
        if (name) localStorage.setItem(LAST_USER_NAME_KEY, name);
        else localStorage.removeItem(LAST_USER_NAME_KEY);
    } catch {
        // Storage unavailable (private mode, blocked site data): the header just falls back to "Login".
    }
}

export function userDisplayName(user: User): string {
    return user.displayName ?? user.email ?? 'User';
}

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUserName] = useState(readLastUserName);

    useEffect(() => {
        return onAuthStateChanged(auth, u => {
            setUser(u);
            setLoading(false);
            rememberUserName(u ? userDisplayName(u) : null);
        });
    }, []);

    return { user, loading, lastUserName };
}
