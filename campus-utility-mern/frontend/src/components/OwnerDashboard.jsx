import { useEffect, useState } from 'react';
import { fetchAnalyticsSummary } from '../api';
import { IdCardThumb } from './StudentInfo';

export default function OwnerDashboard({ label }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsSummary()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-8">
        <p className="text-slate-400">Loading dashboard…</p>
      </div>
    );
  }

  if (!data) return null;

  const maxDaily = Math.max(...data.daily_breakdown.map((d) => d.revenue), 1);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-8">
      <p className="font-display text-2xl font-extrabold text-white">{label} dashboard</p>
      <p className="text-sm text-slate-400">Revenue counts orders once they've actually been handed over.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-marigold-500/15 to-marigold-500/5 p-5">
          <p className="text-xs text-slate-400">Today's revenue</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-marigold-400">₹{data.today_revenue.toFixed(0)}</p>
          <p className="mt-1 text-xs text-slate-500">{data.today_orders} orders</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-teal-500/15 to-teal-500/5 p-5">
          <p className="text-xs text-slate-400">This month</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-teal-300">₹{data.month_revenue.toFixed(0)}</p>
          <p className="mt-1 text-xs text-slate-500">{data.month_orders} orders</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-slate-400">Active queue</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-white">{data.active_orders}</p>
          <p className="mt-1 text-xs text-slate-500">still in progress</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs text-slate-400">Avg. order value</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-white">
            ₹{data.month_orders ? (data.month_revenue / data.month_orders).toFixed(0) : '0'}
          </p>
          <p className="mt-1 text-xs text-slate-500">this month</p>
        </div>
      </div>

      {data.daily_breakdown.length > 0 && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="mb-4 text-sm font-medium text-slate-300">Revenue this month</p>
          <div className="flex h-40 items-end gap-1.5">
            {data.daily_breakdown.map((d) => (
              <div key={d.date} className="group relative flex-1">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-marigold-600 to-marigold-400 transition group-hover:brightness-110"
                  style={{ height: `${Math.max((d.revenue / maxDaily) * 100, 4)}%` }}
                />
                <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-midnight-950 px-2 py-1 text-[10px] text-white group-hover:block">
                  {d.date.slice(5)} · ₹{d.revenue.toFixed(0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="mb-4 text-sm font-medium text-slate-300">Recent history</p>
        {data.recent_history.length === 0 ? (
          <p className="text-sm text-slate-500">No delivered orders yet.</p>
        ) : (
          <div className="scrollbar-thin max-h-[24rem] space-y-3 overflow-y-auto pr-1">
            {data.recent_history.map((o) => (
              <div
                key={o._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-midnight-900 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <IdCardThumb src={o.id_card_photo} />
                  <div>
                    <p className="font-display text-sm font-bold text-white">{o.token_number}</p>
                    <p className="text-xs text-slate-300">
                      {o.user_name} · Roll: {o.roll_no}
                      {o.phone ? ` · 📞 ${o.phone}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">₹{o.total_amount.toFixed(2)}</p>
                  <p className="text-xs text-slate-500">{o.payment_mode}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
