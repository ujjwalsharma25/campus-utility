import { useState } from 'react';
import { buildUpiLink, PAYEE_VPA, PAYEE_NAME } from '../utils/upi';

// navigator.clipboard only works on https/localhost, so on a phone opened via
// http://192.168.x.x it is unavailable - fall back to the old execCommand copy.
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // fall through to the legacy method
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch (err) {
    return false;
  }
}

export default function PaymentModal({ pending, onConfirm, onClose, submitting, error }) {
  const [ref, setRef] = useState('');
  const [copied, setCopied] = useState(false);

  const upiLink = buildUpiLink({ amount: pending.amountNow, note: 'Campus Utility order' });
  const validRef = /^\d{12}$/.test(ref);

  const handleCopy = async () => {
    const ok = await copyText(PAYEE_VPA);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-midnight-950/85 p-4 backdrop-blur-sm">
      <div className="my-auto w-full max-w-sm animate-popIn rounded-3xl border border-white/10 bg-midnight-900 p-6 shadow-2xl">
        <p className="font-display text-lg font-bold text-white">Complete payment</p>
        <p className="mt-1 text-xs text-slate-400">
          Your order reaches the counter only after you confirm the payment below.
        </p>

        <div className="mt-4 rounded-2xl bg-white/5 p-4 text-center">
          <p className="text-xs text-slate-400">
            {pending.mode === 'Cash' ? 'Booking fee to pay now' : 'Amount to pay now'}
          </p>
          <p className="font-display text-4xl font-extrabold text-marigold-400">₹{pending.amountNow.toFixed(2)}</p>
          {pending.cashRemainder > 0 && (
            <p className="mt-1 text-xs text-slate-400">+ ₹{pending.cashRemainder.toFixed(2)} cash at the counter</p>
          )}
        </div>

        <p className="mt-5 text-xs font-medium text-slate-300">Step 1: Pay</p>
        <a
          href={upiLink}
          className="mt-2 block w-full rounded-xl bg-teal-500 py-3 text-center text-sm font-bold text-midnight-950 transition hover:bg-teal-400"
        >
          Pay with UPI app (GPay, PhonePe, Paytm)
        </a>

        <div className="mt-3 rounded-xl border border-white/10 bg-midnight-950 p-3">
          <p className="text-[11px] text-slate-400">Or pay ₹{pending.amountNow.toFixed(2)} manually from any UPI app (Fam too) to:</p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{PAYEE_VPA}</p>
              <p className="truncate text-[11px] text-slate-500">{PAYEE_NAME}</p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/20"
            >
              {copied ? 'Copied' : 'Copy ID'}
            </button>
          </div>
        </div>

        <p className="mt-5 text-xs font-medium text-slate-300">Step 2: Enter the reference number</p>
        <p className="mt-1 text-[11px] text-slate-500">
          After paying, your app shows a 12-digit "UPI reference / UTR / transaction ID". Type it here.
        </p>
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value.replace(/\D/g, '').slice(0, 12))}
          inputMode="numeric"
          placeholder="12-digit reference number"
          className="mt-2 w-full rounded-xl border border-white/10 bg-midnight-950 px-4 py-2.5 text-sm tracking-wider text-white outline-none focus:border-marigold-500"
        />

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

        <button
          onClick={() => onConfirm(ref)}
          disabled={!validRef || submitting}
          className="mt-4 w-full rounded-xl bg-marigold-500 py-3 text-sm font-bold text-midnight-950 transition hover:bg-marigold-400 disabled:opacity-40"
        >
          {submitting ? 'Placing order…' : "I've paid, get my token"}
        </button>
        <button
          onClick={onClose}
          disabled={submitting}
          className="mt-2 w-full rounded-xl bg-white/10 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/20 disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
