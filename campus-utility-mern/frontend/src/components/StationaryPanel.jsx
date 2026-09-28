import { useEffect, useState, useCallback } from 'react';
import { fetchOrders, updateOrderStatus } from '../api';
import TokenCard3D from './TokenCard3D';
import AlertsBar from './AlertsBar';
import StudentInfo from './StudentInfo';
import useNewOrderAlerts from '../hooks/useNewOrderAlerts';

const NEXT_STATUS = { Pending: 'Preparing', Preparing: 'Ready', Ready: 'Delivered' };
const ACTION_LABEL = { Pending: 'Start printing', Preparing: 'Print out done', Ready: 'Handed over' };

export default function StationaryPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const alerts = useNewOrderAlerts(orders, !loading);

  const load = useCallback(() => {
    fetchOrders({ type: 'Print' })
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const advance = async (order) => {
    const next = NEXT_STATUS[order.order_status];
    if (!next) return;
    const updated = await updateOrderStatus(order._id, next);
    setOrders((prev) =>
      updated.order_status === 'Delivered'
        ? prev.filter((o) => o._id !== order._id)
        : prev.map((o) => (o._id === order._id ? { ...o, order_status: updated.order_status } : o))
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-8">
      <AlertsBar {...alerts} />
      <div className="mb-8">
        <p className="font-display text-2xl font-extrabold text-white">Print job queue</p>
        <p className="text-sm text-slate-400">Every job shows what to print, how many pages and in what colour.</p>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading queue…</p>
      ) : orders.length === 0 ? (
        <p className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
          No print jobs waiting. All caught up.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <TokenCard3D key={order._id}>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-midnight-800 to-midnight-900 p-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-extrabold text-marigold-400">{order.token_number}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        order.print_job?.print_type === 'Color'
                          ? 'bg-fuchsia-500/20 text-fuchsia-300'
                          : 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {order.print_job?.print_type}
                    </span>
                  </div>
                  <p className="mt-3 truncate text-sm font-medium text-white">{order.print_job?.filename}</p>
                  <p className="mt-1 text-xs text-slate-400">{order.print_job?.pages} pages</p>
                  <StudentInfo order={order} />
                  <p className="mt-2 text-[11px] text-slate-400">
                    {String(order.payment_ref || '').startsWith('DEMO')
                      ? `Order total ₹${Number(order.total_amount || 0).toFixed(0)} (demo)`
                      : `Paid ₹${Number(order.amount_due_online || 0).toFixed(0)} online${order.payment_ref ? ` · Ref ${order.payment_ref}` : ''}`}
                  </p>
                  {order.amount_due_at_counter > 0 && (
                    <p className="mt-1 inline-block rounded-lg bg-black/25 px-2 py-1 text-xs font-semibold text-marigold-400">
                      Collect ₹{Number(order.amount_due_at_counter).toFixed(0)} cash
                    </p>
                  )}
                  <p className="mt-3 inline-block rounded-lg bg-white/10 px-2.5 py-1 text-xs text-slate-300">
                    {order.order_status}
                  </p>
                </div>
                <button
                  onClick={() => advance(order)}
                  className="mt-4 w-full rounded-xl bg-teal-500 py-2.5 text-sm font-bold text-midnight-950 transition hover:bg-teal-400"
                >
                  {ACTION_LABEL[order.order_status]}
                </button>
              </div>
            </TokenCard3D>
          ))}
        </div>
      )}
    </div>
  );
}
