export default function Receipt({ order, onClose }) {
  if (!order) return null;

  const paidOnline = order.amount_due_online || 0;
  const counterAmount = order.amount_due_at_counter || 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-midnight-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-popIn">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white to-slate-100 text-midnight-950 shadow-2xl">
          <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-midnight-950" />
          <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-midnight-950" />

          <div className="border-b-2 border-dashed border-slate-300 px-6 py-5 text-center">
            <p className="text-xs text-slate-400">MIET Campus Utility · digital coupon</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-marigold-600">{order.token_number}</p>
            <p className="mt-1 text-sm font-semibold text-midnight-950">{order.user_name}</p>
            <p className="text-xs text-slate-500">{order.type === 'Food' ? 'Canteen token' : 'Print shop token'}</p>
          </div>

          <div className="space-y-2 px-6 py-5 text-sm">
            {order.type === 'Food'
              ? order.items.map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>
                      {it.quantity} x {it.item_name}
                    </span>
                  </div>
                ))
              : (
                <>
                  <div className="flex justify-between">
                    <span>File</span>
                    <span className="font-medium">{order.print_job?.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pages</span>
                    <span className="font-medium">{order.print_job?.pages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span className="font-medium">{order.print_job?.print_type}</span>
                  </div>
                </>
              )}
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span>Bill total</span>
              <span className="font-medium">₹{Number(order.total_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-display text-base font-bold">
              <span>{order.payment_mode === 'Cash' ? 'Booking fee paid' : 'Paid via UPI'}</span>
              <span>₹{paidOnline.toFixed(2)}</span>
            </div>
            {order.payment_ref && (
              <p className="text-center text-[11px] text-slate-500">UPI ref {order.payment_ref}</p>
            )}
            {counterAmount > 0 && (
              <p className="rounded-lg bg-marigold-400/20 px-3 py-2 text-center text-xs font-semibold text-midnight-950">
                Pay ₹{counterAmount.toFixed(2)} cash at the counter on pickup
              </p>
            )}
          </div>

          <div className="bg-midnight-950 px-6 py-4 text-center">
            <p className="text-xs text-slate-400">Show this token at the counter</p>
            <p className="mt-1 text-[10px] text-slate-500">
              Placed at {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-white/10 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Done
        </button>
      </div>
    </div>
  );
}
