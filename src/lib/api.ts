export interface User {
  id: number;
  email: string;
  name: string | null;
}

export interface LeaderboardEntry {
  userId: number;
  name: string;
  bestScore: number;
  totalScore: number;
  gamesPlayed: number;
}

export interface Stats {
  gamesPlayed: number;
  bestScore: number | null;
  totalScore: number;
}

export interface Session {
  user: User;
  stats: Stats;
}

const TOKEN_KEY = 'treasure_token';

// Reads the saved auth token. Input: none. Output: token string or null.
const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

// Saves or clears the auth token. Input: token (string | null, null clears). Output: none.
const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // storage unavailable; session lasts until reload
  }
};

// Calls the API and parses JSON. Input: path (string), options (method, optional JSON body). Output: Promise of parsed body; throws Error with server message on non-2xx.
const request = async (path: string, options: { method?: string; body?: unknown } = {}) => {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
};

// Creates an account and signs in. Input: email, password, name (strings; name is the display name). Output: Promise<Session>.
export const signUp = async (email: string, password: string, name: string): Promise<Session> => {
  const data = await request('/signup', { method: 'POST', body: { email, password, name } });
  setToken(data.token);
  return { user: data.user, stats: data.stats };
};

// Signs in an existing account. Input: email, password (strings). Output: Promise<Session>.
export const logIn = async (email: string, password: string): Promise<Session> => {
  const data = await request('/login', { method: 'POST', body: { email, password } });
  setToken(data.token);
  return { user: data.user, stats: data.stats };
};

// Signs out and discards the token. Input: none. Output: Promise<void>.
export const logOut = async (): Promise<void> => {
  await request('/logout', { method: 'POST' }).catch(() => {});
  setToken(null);
};

// Restores a previous session from the saved token. Input: none. Output: Promise<Session | null> (null if not signed in).
export const restoreSession = async (): Promise<Session | null> => {
  if (!getToken()) return null;
  try {
    return await request('/me');
  } catch {
    setToken(null);
    return null;
  }
};

// Fetches the top-10 players by best score (public, no sign-in needed). Input: none. Output: Promise<LeaderboardEntry[]>.
export const fetchLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const data = await request('/leaderboard');
  return data.entries;
};

// Stores a finished game's score for the signed-in user. Input: score (integer). Output: Promise<Stats> (updated stats).
export const saveScore = async (score: number): Promise<Stats> => {
  const data = await request('/scores', { method: 'POST', body: { score } });
  return data.stats;
};
