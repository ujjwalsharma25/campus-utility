import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './components/AuthPage';
import Navbar from './components/Navbar';
import StudentPanel from './components/StudentPanel';
import StudentHistory from './components/StudentHistory';
import CanteenPanel from './components/CanteenPanel';
import StationaryPanel from './components/StationaryPanel';
import ManageMenuPanel from './components/ManageMenuPanel';
import OwnerDashboard from './components/OwnerDashboard';
import Leaderboard from './components/Leaderboard';

const TABS_BY_ROLE = {
  student: [
    { key: 'order', label: 'Order', icon: '🍽️' },
    { key: 'dashboard', label: 'My dashboard', icon: '📊' },
  ],
  canteen_owner: [
    { key: 'queue', label: 'Kitchen queue', icon: '🍳' },
    { key: 'menu', label: 'Manage menu', icon: '⚙️' },
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  ],
  stationary_admin: [
    { key: 'queue', label: 'Print queue', icon: '🖨️' },
    { key: 'menu', label: 'Manage items', icon: '⚙️' },
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  ],
};

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-32 -top-32 h-96 w-96 animate-floatSlow rounded-full bg-marigold-500/10 blur-3xl" />
      <div
        className="absolute -right-32 top-1/2 h-96 w-96 animate-floatSlow rounded-full bg-teal-500/10 blur-3xl"
        style={{ animationDelay: '2s' }}
      />
    </div>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const tabs = TABS_BY_ROLE[user.role];
  const [view, setView] = useState(tabs[0].key);

  return (
    <div className="min-h-screen bg-midnight-950">
      <Background />
      <div className="relative">
        <Navbar view={view} setView={setView} tabs={tabs} />

        {user.role === 'student' && (
          <>
            {view === 'order' && (
              <div className="mx-auto max-w-6xl px-6 pt-8">
                <Leaderboard />
              </div>
            )}
            {view === 'order' && <StudentPanel />}
            {view === 'dashboard' && <StudentHistory />}
          </>
        )}

        {user.role === 'canteen_owner' && (
          <>
            {view === 'queue' && <CanteenPanel />}
            {view === 'menu' && <ManageMenuPanel />}
            {view === 'dashboard' && <OwnerDashboard label="Canteen" />}
          </>
        )}

        {user.role === 'stationary_admin' && (
          <>
            {view === 'queue' && <StationaryPanel />}
            {view === 'menu' && <ManageMenuPanel />}
            {view === 'dashboard' && <OwnerDashboard label="Stationary shop" />}
          </>
        )}
      </div>
    </div>
  );
}

function Root() {
  const { user } = useAuth();
  return user ? <AuthenticatedApp /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
