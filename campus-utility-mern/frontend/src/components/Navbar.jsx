import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = {
  student: 'Student',
  canteen_owner: 'Canteen owner',
  stationary_admin: 'Stationary admin',
};

export default function Navbar({ view, setView, tabs }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-midnight-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-marigold-400 to-marigold-600 shadow-glow">
            <span className="font-display text-xl font-extrabold text-midnight-950">M</span>
          </div>
          <div>
            <p className="font-display text-lg font-bold leading-tight text-white">MIET Campus Utility</p>
            <p className="text-xs text-slate-400">{ROLE_LABEL[user?.role]} · {user?.name}</p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 rounded-2xl bg-white/5 p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                view === tab.key
                  ? 'bg-marigold-500 text-midnight-950 shadow-glow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          <button
            onClick={logout}
            className="rounded-xl px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
