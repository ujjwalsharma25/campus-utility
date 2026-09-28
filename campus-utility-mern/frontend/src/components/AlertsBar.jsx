export default function AlertsBar({ enabled, enable, disable, test }) {
  if (!enabled) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-marigold-500/40 bg-marigold-500/10 px-4 py-3">
        <p className="text-sm text-marigold-400">🔔 Voice alerts are off. Turn them on to hear every new order.</p>
        <button
          onClick={enable}
          className="rounded-xl bg-marigold-500 px-4 py-2 text-sm font-bold text-midnight-950 transition hover:bg-marigold-400"
        >
          Turn on alerts
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-500/40 bg-teal-500/10 px-4 py-3">
      <p className="text-sm text-teal-300">🔊 Voice alerts are on. Keep this tab open on the counter device.</p>
      <div className="flex gap-2">
        <button
          onClick={test}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/20"
        >
          Test
        </button>
        <button
          onClick={disable}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/20"
        >
          Turn off
        </button>
      </div>
    </div>
  );
}
