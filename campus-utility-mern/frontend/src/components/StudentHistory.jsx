import { useEffect, useState } from 'react';
import { fetchOrderHistory } from '../api';
import { useAuth } from '../context/AuthContext';

const STATUS_DOT = {
  Pending: 'bg-rose-400',
  Preparing: 'bg-amber-400',
  Ready: 'bg-teal-400',
  Delivered: 'bg-slate-500',
};

export default function StudentHistory() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchOrderHistory(user._id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-8">
        <p className="text-slate-400">Loading your history…</p>
      </div>
    );
  }

  if (!data || data.orders.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-8">
        <p className="font-display text-2xl font-extrabold text-white">My dashboard</p>
        <p className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
          No orders yet. Once you place one, your spend and history will show up here.
        </p>
      </div>
    );
  }

  const maxMonthly = Math.max(...data.monthly_spend.map((m) => m.amount), 1);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-8">
      <p className="font-display text-2xl font-extrabold text-white">My dashboard</p>
      <p className="text-sm text-slate-400">Every rupee spent on food and printing, all in one place.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-marigold-500/15 to-marigold-500/5 p-5">
          <p className="text-xs text-slate-400">Total spend</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-marigold-400">
            ₹{data.total_spend.toFixed(0)}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-teal-500/15 to-teal-500/5 p-5">
          <p className="text-xs text-slate-400">Total orders</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-teal-300">{data.total_orders}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-slate-400">This month</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-white">
            ₹{(data.monthly_spend[0]?.amount || 0).toFixed(0)}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="mb-4 text-sm font-medium text-slate-300">Monthly spend</p>
        <div className="space-y-3">
          {data.monthly_spend.map((m) => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-xs text-slate-400">{m.month}</span>
              <div className="h-2.5 flex-1 rounded-full bg-white/5">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-marigold-500 to-marigold-400"
                  style={{ width: `${Math.max((m.amount / maxMonthly) * 100, 4)}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-medium text-white">₹{m.amount.toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="mb-4 text-sm font-medium text-slate-300">Order history</p>
        <div className="scrollbar-thin max-h-[28rem] space-y-3 overflow-y-auto pr-1">
          {data.orders.map((o) => (
            <div
              key={o._id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-midnight-900 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[o.order_status]}`} />
                <div>
                  <p className="font-display text-sm font-bold text-white">
                    {o.token_number} <span className="ml-1 font-body text-xs font-normal text-slate-400">· {o.type}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(o.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
                    {o.payment_mode}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">₹{(o.total_amount + (o.advance_fee || 0)).toFixed(2)}</p>
                <p className="text-xs text-slate-500">{o.order_status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
