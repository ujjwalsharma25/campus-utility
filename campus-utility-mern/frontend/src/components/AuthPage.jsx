import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { key: 'student', label: 'Student', icon: '🎓' },
  { key: 'canteen_owner', label: 'Canteen owner', icon: '🍽️' },
  { key: 'stationary_admin', label: 'Stationary admin', icon: '🖨️' },
];

export default function AuthPage() {
  const { login, signup, authError, authLoading } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({ name: '', roll_no: '', phone: '', password: '' });
  const [localError, setLocalError] = useState('');
  const [idCard, setIdCard] = useState(null);
  const [idPreview, setIdPreview] = useState('');

  const isStudent = role === 'student';

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const pickIdCard = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setLocalError('ID card photo must be under 3 MB.');
      return;
    }
    setLocalError('');
    setIdCard(file);
    setIdPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!form.password || (isStudent && !form.roll_no) || (!isStudent && !form.phone)) {
      setLocalError('Please fill in every field.');
      return;
    }
    if (mode === 'signup' && (!form.name || (!isStudent && !form.phone))) {
      setLocalError('Please fill in every field.');
      return;
    }

    if (mode === 'signup') {
      if (!/^\d{10}$/.test(form.phone.trim())) {
        setLocalError('Mobile number must be exactly 10 digits.');
        return;
      }
      if (isStudent && !idCard) {
        setLocalError('Please upload your ID card photo.');
        return;
      }
      if (isStudent) {
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('role', role);
        fd.append('roll_no', form.roll_no);
        fd.append('phone', form.phone.trim());
        fd.append('password', form.password);
        fd.append('id_card', idCard);
        await signup(fd);
      } else {
        await signup({ name: form.name, role, phone: form.phone.trim(), password: form.password });
      }
    } else {
      await login({
        role,
        roll_no: isStudent ? form.roll_no : undefined,
        phone: !isStudent ? form.phone : undefined,
        password: form.password,
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-midnight-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 animate-floatSlow rounded-full bg-marigold-500/10 blur-3xl" />
        <div
          className="absolute -right-32 top-1/2 h-96 w-96 animate-floatSlow rounded-full bg-teal-500/10 blur-3xl"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-marigold-400 to-marigold-600 shadow-glow">
            <span className="font-display text-2xl font-extrabold text-midnight-950">M</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-white">MIET Campus Utility</p>
          <p className="mt-2 text-sm text-slate-400">Skip the line, not the meal.</p>
        </div>

        <div className="animate-popIn rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
          <div className="mb-5 flex gap-2 rounded-2xl bg-white/5 p-1.5">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setLocalError('');
                }}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                  mode === m ? 'bg-marigold-500 text-midnight-950' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRole(r.key)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition ${
                  role === r.key
                    ? 'border-teal-500 bg-teal-500/15 text-teal-200'
                    : 'border-white/10 bg-midnight-900 text-slate-400 hover:border-white/20'
                }`}
              >
                <span className="text-lg">{r.icon}</span>
                <span className="text-[11px] leading-tight">{r.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Full name</label>
                <input
                  value={form.name}
                  onChange={update('name')}
                  className="w-full rounded-xl border border-white/10 bg-midnight-900 px-4 py-2.5 text-sm text-white outline-none focus:border-marigold-500"
                  placeholder={isStudent ? 'Aditya Sharma' : 'Counter staff name'}
                />
              </div>
            )}

            {isStudent ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Roll number</label>
                <input
                  value={form.roll_no}
                  onChange={update('roll_no')}
                  className="w-full rounded-xl border border-white/10 bg-midnight-900 px-4 py-2.5 text-sm text-white outline-none focus:border-marigold-500"
                  placeholder="2201CS0042"
                />
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Mobile number</label>
                <input
                  value={form.phone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="w-full rounded-xl border border-white/10 bg-midnight-900 px-4 py-2.5 text-sm text-white outline-none focus:border-marigold-500"
                  placeholder="9876543210"
                />
              </div>
            )}

            {mode === 'signup' && isStudent && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">Mobile number</label>
                <input
                  value={form.phone}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="w-full rounded-xl border border-white/10 bg-midnight-900 px-4 py-2.5 text-sm text-white outline-none focus:border-marigold-500"
                  placeholder="9876543210"
                />
              </div>
            )}

            {mode === 'signup' && isStudent && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">College ID card photo</label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 bg-midnight-900 px-4 py-3 text-sm text-slate-300 hover:border-marigold-500">
                  {idPreview ? (
                    <img src={idPreview} alt="ID card preview" className="h-14 w-20 rounded-lg object-cover" />
                  ) : (
                    <span className="text-2xl">🪪</span>
                  )}
                  <span className="text-xs">{idCard ? idCard.name : 'Tap to upload / take a photo of your ID card'}</span>
                  <input type="file" accept="image/*" onChange={pickIdCard} className="hidden" />
                </label>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                className="w-full rounded-xl border border-white/10 bg-midnight-900 px-4 py-2.5 text-sm text-white outline-none focus:border-marigold-500"
                placeholder="••••••••"
              />
            </div>

            {(localError || authError) && <p className="text-sm text-rose-400">{localError || authError}</p>}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-xl bg-marigold-500 py-3 text-sm font-bold text-midnight-950 transition hover:bg-marigold-400 disabled:opacity-50"
            >
              {authLoading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Canteen and stationary staff: ask your admin for your login, or check the README for the demo accounts.
        </p>
      </div>
    </div>
  );
}
