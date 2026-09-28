import { useEffect, useState, useCallback } from 'react';
import { fetchOrders, updateOrderStatus } from '../api';
import TokenCard3D from './TokenCard3D';
import AlertsBar from './AlertsBar';
import StudentInfo from './StudentInfo';
import useNewOrderAlerts from '../hooks/useNewOrderAlerts';

const NEXT_STATUS = { Pending: 'Preparing', Preparing: 'Ready', Ready: 'Delivered' };
const COLUMN_STYLE = {
  Pending: 'from-rose-500/15 to-rose-500/5 border-rose-500/30 text-rose-200',
  Preparing: 'from-amber-500/15 to-amber-500/5 border-amber-500/30 text-amber-200',
  Ready: 'from-teal-500/15 to-teal-500/5 border-teal-500/30 text-teal-200',
};

export default function CanteenPanel() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const alerts = useNewOrderAlerts(orders, !loading);

  const load = useCallback(() => {
    fetchOrders({ type: 'Food' })
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

  const columns = ['Pending', 'Preparing', 'Ready'];

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-8">
      <AlertsBar {...alerts} />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl font-extrabold text-white">Kitchen queue</p>
          <p className="text-sm text-slate-400">
            Tokens move left to right as food comes together. First in, first served.
          </p>
        </div>
        <div className="rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-300">{orders.length} active tokens</div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading queue…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {columns.map((col) => {
            const colOrders = orders.filter((o) => o.order_status === col);
            return (
              <div key={col} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-display text-sm font-semibold text-slate-300">{col}</p>
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-slate-300">
                    {colOrders.length}
                  </span>
                </div>
                <div className="space-y-4">
                  {colOrders.length === 0 && <p className="text-xs text-slate-500">Nothing here right now.</p>}
                  {colOrders.map((order) => (
                    <TokenCard3D key={order._id}>
                      <button
                        onClick={() => advance(order)}
                        className={`w-full rounded-2xl border bg-gradient-to-br p-4 text-left transition hover:brightness-110 ${COLUMN_STYLE[col]}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-2xl font-extrabold text-white">{order.token_number}</span>
                          <span className="text-xs">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <StudentInfo order={order} />
                        <p className="mt-2 text-[11px] text-slate-400">
                          {String(order.payment_ref || '').startsWith('DEMO')
                            ? `Order total ₹${Number(order.total_amount || 0).toFixed(0)} (demo)`
                            : `Paid ₹${Number(order.amount_due_online || 0).toFixed(0)} online${order.payment_ref ? ` · Ref ${order.payment_ref}` : ''}`}
                        </p>
                        {order.amount_due_at_counter > 0 && (
                          <p className="mt-1 rounded-lg bg-black/25 px-2 py-1 text-xs font-semibold text-marigold-400">
                            Collect ₹{Number(order.amount_due_at_counter).toFixed(0)} cash
                          </p>
                        )}
                        <ul className="mt-3 space-y-1 text-sm text-slate-200">
                          {order.items.map((it, i) => (
                            <li key={i}>
                              {it.quantity} x {it.item_name}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-xs font-medium underline decoration-dotted">
                          Tap to mark {NEXT_STATUS[col]}
                        </p>
                      </button>
                    </TokenCard3D>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
