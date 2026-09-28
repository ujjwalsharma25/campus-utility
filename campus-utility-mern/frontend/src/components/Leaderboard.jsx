import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../api';

export default function Leaderboard() {
  const [top, setTop] = useState([]);

  useEffect(() => {
    fetchLeaderboard().then(setTop);
  }, []);

  if (top.length === 0) return null;

  const medals = ['🥇', '🥈', '🥉', '🎖️'];

  return (
    <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-r from-midnight-900 to-midnight-800 p-5">
      <p className="text-sm font-medium text-slate-400">Most orders placed this term</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {top.map((u, i) => (
          <div key={u._id} className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2.5">
            <span className="text-lg">{medals[i]}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{u.name}</p>
              <p className="text-xs text-slate-400">{u.order_count} orders</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
