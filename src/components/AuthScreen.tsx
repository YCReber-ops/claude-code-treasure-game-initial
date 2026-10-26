import { useState } from 'react';
import { Button } from './ui/button';
import Leaderboard from './Leaderboard';
import { logIn, signUp, type Session } from '../lib/api';

interface AuthScreenProps {
  onSignedIn: (session: Session) => void;
  onGuest: () => void;
}

// Sign in / sign up form with a guest option. Input: onSignedIn (called with the session on success), onGuest (called when choosing guest mode). Output: JSX.
export default function AuthScreen({ onSignedIn, onGuest }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session = await (isSignUp ? signUp(email, password, name) : logIn(email, password));
      onSignedIn(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border-2 border-amber-300 bg-white text-amber-900 focus:outline-none focus:border-amber-500';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center gap-6 p-8">
      <div className="w-full max-w-sm p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
        <h1 className="text-3xl text-center mb-6 text-amber-900">🏴‍☠️ Treasure Hunt 🏴‍☠️</h1>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {isSignUp && (
            <input
              className={inputClass}
              placeholder="Name (shown on the leaderboard)"
              autoComplete="name"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className={inputClass}
            type="email"
            placeholder="E-mail"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className={inputClass}
            type="password"
            placeholder="Password (min 6 characters)"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <Button type="submit" disabled={busy} className="bg-amber-600 hover:bg-amber-700 text-white">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </form>
        <button
          type="button"
          className="mt-3 w-full text-sm text-amber-800 underline"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
        >
          {isSignUp ? 'Already have an account? Sign in' : "No account? Sign up"}
        </button>
        <div className="my-4 border-t border-amber-400" />
        <Button variant="outline" onClick={onGuest} className="w-full">
          Play as Guest
        </Button>
        <p className="mt-2 text-xs text-center text-amber-700">Guest scores are not saved.</p>
      </div>
      <Leaderboard />

    </div>
  );
}
