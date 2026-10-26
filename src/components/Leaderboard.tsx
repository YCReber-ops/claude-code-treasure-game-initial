import { useEffect, useState } from 'react';
import { fetchLeaderboard, type LeaderboardEntry } from '../lib/api';

interface LeaderboardProps {
  refreshKey?: number;
  currentUserId?: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];

// Top-10 leaderboard card. Input: refreshKey (change it to reload), currentUserId (highlights that player's row). Output: JSX.
export default function Leaderboard({ refreshKey = 0, currentUserId }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchLeaderboard()
      .then((rows) => {
        setEntries(rows);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [refreshKey]);

  return (
    <div className="w-72 p-4 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
      <h2 className="text-lg text-center mb-2 text-amber-900">🏆 Top 10 Leaderboard</h2>
      {failed && <p className="text-sm text-center text-amber-700">Leaderboard unavailable.</p>}
      {!failed && entries && entries.length === 0 && (
        <p className="text-sm text-center text-amber-700">No scores yet. Be the first!</p>
      )}
      {entries && entries.length > 0 && (
        <ol className="text-sm text-amber-900">
          {entries.map((e, i) => (
            <li
              key={e.userId}
              className={`flex items-center gap-2 px-2 py-1 rounded ${
                e.userId === currentUserId ? 'bg-amber-400/60 font-bold' : ''
              }`}
            >
              <span className="w-6 text-center">{MEDALS[i] ?? i + 1}</span>
              <span className="flex-1 truncate" title={e.name}>{e.name}</span>
              <span className="text-green-700">${e.bestScore}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-xs text-center text-amber-700">Ranked by best score</p>
    </div>
  );
}
