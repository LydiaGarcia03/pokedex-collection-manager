import { FirebaseError } from 'firebase/app';
import { updateProfile } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { login, register } from '../firebase/auth';

interface AuthModalProps {
    onClose: () => void;
    onSuccess: (isNewUser: boolean) => void;
}

type Mode = 'login' | 'register';

const FIREBASE_ERRORS: Record<string, string> = {
    'auth/invalid-credential':         'Incorrect email or password.',
    'auth/user-not-found':             'Incorrect email or password.',
    'auth/wrong-password':             'Incorrect email or password.',
    'auth/email-already-in-use':       'This email is already registered.',
    'auth/weak-password':              'Password must be at least 6 characters.',
    'auth/invalid-email':              'Invalid email address.',
    'auth/too-many-requests':          'Too many attempts. Please try again later.',
    'appCheck/token-generation-failed': 'Security check failed. Please reload the page and try again.',
    'appCheck/fetch-status-error':      'Security check failed. Please reload the page and try again.',
};

export function AuthModal({ onClose, onSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    function switchMode(next: Mode) {
        setMode(next);
        setError(null);
        setPassword('');
        setDisplayName('');
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (mode === 'register' && !displayName.trim()) {
            setError('Please enter a display name.');
            return;
        }
        setLoading(true);
        try {
            if (mode === 'login') {
                await login(email, password);
                onSuccess(false);
            } else {
                const cred = await register(email, password);
                await updateProfile(cred.user, { displayName: displayName.trim() });
                onSuccess(true);
            }
        } catch (err) {
            const code = err instanceof FirebaseError ? err.code : '';
            setError(FIREBASE_ERRORS[code] ?? 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="collection-modal-backdrop" role="presentation" onClick={onClose}>
            <div
                className="collection-modal auth-modal"
                role="dialog"
                aria-modal="true"
                aria-label={mode === 'login' ? 'Login' : 'Create Account'}
                onClick={e => e.stopPropagation()}
            >
                <div className="auth-modal__tabs">
                    <button
                        type="button"
                        className={`auth-modal__tab${mode === 'login' ? ' auth-modal__tab--active' : ''}`}
                        onClick={() => switchMode('login')}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        className={`auth-modal__tab${mode === 'register' ? ' auth-modal__tab--active' : ''}`}
                        onClick={() => switchMode('register')}
                    >
                        Create Account
                    </button>
                </div>

                <form className="auth-modal__form" onSubmit={handleSubmit} noValidate>
                    {mode === 'register' && (
                        <div className="auth-modal__field">
                            <label htmlFor="auth-display-name" className="auth-modal__label">Display Name</label>
                            <input
                                id="auth-display-name"
                                type="text"
                                className="auth-modal__input"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                autoComplete="nickname"
                                maxLength={40}
                                required
                                disabled={loading}
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="auth-modal__field">
                        <label htmlFor="auth-email" className="auth-modal__label">Email</label>
                        <input
                            id="auth-email"
                            type="email"
                            className="auth-modal__input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="auth-modal__field">
                        <label htmlFor="auth-password" className="auth-modal__label">Password</label>
                        <div className="auth-modal__password-wrapper">
                            <input
                                id="auth-password"
                                type={showPassword ? 'text' : 'password'}
                                className="auth-modal__input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                className="auth-modal__password-toggle"
                                onClick={() => setShowPassword(v => !v)}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="auth-modal__error">{error}</p>
                    )}

                    <div className="collection-modal__actions">
                        <button
                            type="button"
                            className="collection-modal__btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="collection-modal__btn-primary"
                            disabled={loading || !email || !password}
                        >
                            {loading ? 'Please wait…' : mode === 'login' ? 'Login' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
